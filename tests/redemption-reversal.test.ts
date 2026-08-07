import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../generated/prisma/client";
import { recordRedemptionReversal } from "../lib/loyalty/redemption-reversal";
import { isFinancialOperationContextError } from "../lib/loyalty/transactions";

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

const originalRedemption = {
  id: "redemption-1",
  cost: 6,
  rewardId: "reward-1",
  rewardName: "Free coffee",
  transaction: {
    id: "redeem-tx-1",
    type: "REDEEM" as const,
    amount: -6,
    sourceLoyaltyMode: null,
  },
};

function createTransaction(options: {
  original?: typeof originalRedemption | null;
  existing?: {
    id: string;
    businessId: string;
    customerId: string;
    type: "REVERSAL";
    amount: number;
    balanceAfter: number;
    reversalOfTransactionId: string;
    reversalKind: "REDEMPTION_REVERSAL";
    reversalReason: string;
  } | null;
  priorReversal?: boolean;
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
      findFirst: async () => ({ balance: options.balanceAfter ?? 14 }),
    },
    rewardRedemption: {
      findFirst: async () =>
        options.original === undefined ? originalRedemption : options.original,
    },
    loyaltyTransaction: {
      findUnique: async () => options.existing ?? null,
      findFirst: async () =>
        options.priorReversal ? { id: "prior-reversal" } : null,
      create: async (args: unknown) => {
        calls.reversals.push(args);
        return { id: "reversal-1" };
      },
    },
    businessActivity: {
      findFirst: async () => ({
        metadata: {
          unlockRestoreRequested: false,
        },
      }),
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
      count: async () => 0,
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

const input = {
  customerId: "customer-1",
  businessId: "business-1",
  originalRedemptionId: "redemption-1",
  originalTransactionId: "redeem-tx-1",
  actor: owner,
  reason: "Reward fulfillment cancelled",
  idempotencyKey: "redemption-reversal-1",
  restoreUnlock: false,
};

test("owner redemption reversal restores the original cost without rewriting gross lifetime redeemed", async () => {
  const { transaction, calls } = createTransaction({ balanceAfter: 14 });

  const result = await recordRedemptionReversal(transaction, input);

  assert.deepEqual(result, {
    status: "APPLIED",
    balanceAfter: 14,
    transactionId: "reversal-1",
  });
  assert.deepEqual(calls.updates, [
    {
      where: {
        id: "customer-1",
        businessId: "business-1",
        isActive: true,
      },
      data: {
        balance: { increment: 6 },
      },
    },
  ]);
  assert.deepEqual(calls.reversals, [
    {
      data: {
        type: "REVERSAL",
        amount: 6,
        balanceAfter: 14,
        note: "Redemption reversal: Reward fulfillment cancelled",
        sourceLoyaltyMode: null,
        idempotencyKey: "redemption-reversal-1",
        reversalOfTransactionId: "redeem-tx-1",
        reversalKind: "REDEMPTION_REVERSAL",
        reversalReason: "Reward fulfillment cancelled",
        customerId: "customer-1",
        businessId: "business-1",
        createdById: "owner-1",
      },
    },
  ]);
  assert.equal(calls.activities.length, 1);
  assert.equal(calls.notifications.length, 1);
});

test("manager cannot reverse a redemption", async () => {
  const { transaction, calls } = createTransaction();

  await assert.rejects(
    () =>
      recordRedemptionReversal(transaction, {
        ...input,
        actor: {
          id: "manager-1",
          role: "MANAGER",
          businessId: "business-1",
        },
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

test("redemption reversal requires the exact same-tenant redemption and REDEEM transaction", async () => {
  const { transaction, calls } = createTransaction({ original: null });

  const result = await recordRedemptionReversal(transaction, input);

  assert.deepEqual(result, {
    status: "BLOCKED",
    reason: "ORIGINAL_REDEMPTION_NOT_FOUND",
  });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.reversals.length, 0);
});

test("a redemption can only be reversed once", async () => {
  const { transaction, calls } = createTransaction({ priorReversal: true });

  const result = await recordRedemptionReversal(transaction, input);

  assert.deepEqual(result, {
    status: "BLOCKED",
    reason: "ALREADY_REVERSED",
  });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.reversals.length, 0);
});

test("same operation ID with identical redemption reversal intent replays the prior result", async () => {
  const { transaction, calls } = createTransaction({
    existing: {
      id: "reversal-existing",
      businessId: "business-1",
      customerId: "customer-1",
      type: "REVERSAL",
      amount: 6,
      balanceAfter: 14,
      reversalOfTransactionId: "redeem-tx-1",
      reversalKind: "REDEMPTION_REVERSAL",
      reversalReason: "Reward fulfillment cancelled",
    },
  });

  const result = await recordRedemptionReversal(transaction, input);

  assert.deepEqual(result, {
    status: "REPLAYED",
    balanceAfter: 14,
    transactionId: "reversal-existing",
  });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.reversals.length, 0);
});

test("unlock restoration is explicit and remains blocked until a safe redemption-to-unlock link exists", async () => {
  const { transaction, calls } = createTransaction();

  const result = await recordRedemptionReversal(transaction, {
    ...input,
    restoreUnlock: true,
  });

  assert.deepEqual(result, {
    status: "BLOCKED",
    reason: "UNLOCK_RESTORE_UNSUPPORTED",
  });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.reversals.length, 0);
  assert.equal(calls.activities.length, 0);
});
