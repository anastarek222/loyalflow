import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../generated/prisma/client";
import { recordEarnReversal } from "../lib/loyalty/earn-reversal";
import { isFinancialOperationContextError } from "../lib/loyalty/transactions";

type OriginalEarn = {
  id: string;
  amount: number;
  saleAmount: number | null;
  sourceLoyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT" | null;
};

type ExistingReversal = {
  id: string;
  businessId: string;
  customerId: string;
  type: "REVERSAL";
  amount: number;
  saleAmount: number | null;
  balanceAfter: number;
  reversalOfTransactionId: string;
  reversalKind: "EARN_REFUND" | "EARN_VOID";
  reversalReason: string;
};

type Calls = {
  updates: unknown[];
  reversals: unknown[];
  activities: unknown[];
  notifications: unknown[];
};

const owner = {
  id: "owner-1",
  role: "OWNER" as const,
  businessId: "business-1",
};

function createTransaction(options: {
  original?: OriginalEarn | null;
  existing?: ExistingReversal | null;
  priorAmount?: number;
  priorSaleAmount?: number;
  updateCount?: number;
  balanceAfter?: number;
  customerExists?: boolean;
} = {}) {
  const calls: Calls = {
    updates: [],
    reversals: [],
    activities: [],
    notifications: [],
  };

  const original =
    options.original === undefined
      ? {
          id: "earn-1",
          amount: 10,
          saleAmount: null,
          sourceLoyaltyMode: "VISITS" as const,
        }
      : options.original;

  const transaction = {
    business: {
      findUnique: async () => ({
        staffAttributionEnabled: false,
        staffAttributionRequired: false,
      }),
    },
    customer: {
      updateMany: async (args: unknown) => {
        calls.updates.push(args);
        return { count: options.updateCount ?? 1 };
      },
      findFirst: async () => ({ balance: options.balanceAfter ?? 7 }),
    },
    loyaltyTransaction: {
      findUnique: async () => options.existing ?? null,
      findFirst: async () => original,
      aggregate: async () => ({
        _sum: {
          amount: options.priorAmount ?? 0,
          saleAmount: options.priorSaleAmount ?? 0,
        },
      }),
      create: async (args: unknown) => {
        calls.reversals.push(args);
        return { id: "reversal-1" };
      },
    },
    businessActivity: {
      create: async (args: unknown) => {
        calls.activities.push(args);
        return {};
      },
    },
    notification: {
      create: async (args: unknown) => {
        calls.notifications.push(args);
        return {};
      },
    },
    branch: {
      findFirst: async () => ({ id: "branch-1" }),
    },
    branchStaffAssignment: {
      findFirst: async () => ({ id: "assignment-1" }),
    },
    user: {
      findFirst: async () => ({ id: "staff-1", role: "STAFF" }),
    },
    $queryRaw: async () =>
      options.customerExists === false ? [] : [{ id: "customer-1" }],
  } as unknown as Prisma.TransactionClient;

  return { transaction, calls };
}

test("owner partial refund creates one linked REVERSAL without rewriting lifetime earned", async () => {
  const { transaction, calls } = createTransaction({ balanceAfter: 6 });

  const result = await recordEarnReversal(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    originalTransactionId: "earn-1",
    actor: owner,
    kind: "EARN_REFUND",
    amount: 4,
    reason: "Returned item",
    idempotencyKey: "refund-1",
  });

  assert.deepEqual(result, {
    status: "APPLIED",
    balanceAfter: 6,
    transactionId: "reversal-1",
  });
  assert.deepEqual(calls.updates, [
    {
      where: {
        id: "customer-1",
        businessId: "business-1",
        isActive: true,
        balance: { gte: 4 },
      },
      data: {
        balance: { decrement: 4 },
      },
    },
  ]);
  assert.deepEqual(calls.reversals, [
    {
      data: {
        type: "REVERSAL",
        amount: -4,
        balanceAfter: 6,
        note: "Earn refund: Returned item",
        sourceLoyaltyMode: "VISITS",
        idempotencyKey: "refund-1",
        reversalOfTransactionId: "earn-1",
        reversalKind: "EARN_REFUND",
        reversalReason: "Returned item",
        customerId: "customer-1",
        businessId: "business-1",
        createdById: "owner-1",
      },
    },
  ]);
  assert.equal(calls.activities.length, 1);
  assert.equal(calls.notifications.length, 1);
});

test("manager cannot run an earn reversal even though managers can adjust balances", async () => {
  const { transaction, calls } = createTransaction();

  await assert.rejects(
    () =>
      recordEarnReversal(transaction, {
        customerId: "customer-1",
        businessId: "business-1",
        originalTransactionId: "earn-1",
        actor: {
          id: "manager-1",
          role: "MANAGER",
          businessId: "business-1",
        },
        kind: "EARN_REFUND",
        amount: 2,
        reason: "Refund",
        idempotencyKey: "refund-manager",
      }),
    (error: unknown) => {
      assert.ok(isFinancialOperationContextError(error));
      assert.equal(error.reason, "ACTOR_NOT_ALLOWED");
      return true;
    },
  );

  assert.equal(calls.updates.length, 0);
  assert.equal(calls.reversals.length, 0);
});

test("cumulative partial refunds cannot exceed the original earned amount", async () => {
  const { transaction, calls } = createTransaction({ priorAmount: -8 });

  const result = await recordEarnReversal(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    originalTransactionId: "earn-1",
    actor: owner,
    kind: "EARN_REFUND",
    amount: 3,
    reason: "Second refund",
    idempotencyKey: "refund-2",
  });

  assert.deepEqual(result, {
    status: "BLOCKED",
    reason: "REVERSAL_EXCEEDS_ORIGINAL",
  });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.reversals.length, 0);
});

test("insufficient current balance blocks the refund without ledger or audit side effects", async () => {
  const { transaction, calls } = createTransaction({ updateCount: 0 });

  const result = await recordEarnReversal(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    originalTransactionId: "earn-1",
    actor: owner,
    kind: "EARN_REFUND",
    amount: 4,
    reason: "Refund after spend",
    idempotencyKey: "refund-insufficient",
  });

  assert.deepEqual(result, {
    status: "BLOCKED",
    reason: "INSUFFICIENT_BALANCE",
  });
  assert.equal(calls.reversals.length, 0);
  assert.equal(calls.activities.length, 0);
  assert.equal(calls.notifications.length, 0);
});

test("same operation ID with the same immutable reversal intent replays the prior result", async () => {
  const { transaction, calls } = createTransaction({
    existing: {
      id: "reversal-existing",
      businessId: "business-1",
      customerId: "customer-1",
      type: "REVERSAL",
      amount: -4,
      saleAmount: null,
      balanceAfter: 6,
      reversalOfTransactionId: "earn-1",
      reversalKind: "EARN_REFUND",
      reversalReason: "Returned item",
    },
  });

  const result = await recordEarnReversal(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    originalTransactionId: "earn-1",
    actor: owner,
    kind: "EARN_REFUND",
    amount: 4,
    reason: "Returned item",
    idempotencyKey: "refund-1",
  });

  assert.deepEqual(result, {
    status: "REPLAYED",
    balanceAfter: 6,
    transactionId: "reversal-existing",
  });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.reversals.length, 0);
});

test("void requires an untouched full original operation", async () => {
  const { transaction, calls } = createTransaction({ priorAmount: -2 });

  const result = await recordEarnReversal(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    originalTransactionId: "earn-1",
    actor: owner,
    kind: "EARN_VOID",
    amount: 8,
    reason: "Duplicate operation",
    idempotencyKey: "void-1",
  });

  assert.deepEqual(result, {
    status: "BLOCKED",
    reason: "VOID_REQUIRES_FULL_ORIGINAL",
  });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.reversals.length, 0);
});

test("sales refunds require and cap the recorded sale portion independently", async () => {
  const { transaction, calls } = createTransaction({
    original: {
      id: "earn-1",
      amount: 10,
      saleAmount: 250,
      sourceLoyaltyMode: "SALES_AMOUNT",
    },
    priorAmount: -3,
    priorSaleAmount: 200,
  });

  const result = await recordEarnReversal(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    originalTransactionId: "earn-1",
    actor: owner,
    kind: "EARN_REFUND",
    amount: 2,
    saleAmount: 60,
    reason: "Partial sale refund",
    idempotencyKey: "sales-refund-1",
  });

  assert.deepEqual(result, {
    status: "BLOCKED",
    reason: "SALE_REVERSAL_EXCEEDS_ORIGINAL",
  });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.reversals.length, 0);
});
