import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../generated/prisma/client";
import { recordRedemptionReversal } from "../lib/loyalty/redemption-reversal";
import { isFinancialOperationConflictError } from "../lib/loyalty/transactions";

const owner = {
  id: "owner-1",
  role: "OWNER" as const,
  businessId: "business-1",
};

const linkedOriginal = {
  id: "redemption-1",
  cost: 6,
  rewardId: "reward-1",
  rewardName: "Free coffee",
  rewardUnlockId: "unlock-1",
  rewardUnlock: {
    id: "unlock-1",
    businessId: "business-1",
    customerId: "customer-1",
    rewardId: "reward-1",
    redeemedAt: new Date("2026-08-07T10:00:00.000Z"),
    expiredAt: null,
  },
  transaction: {
    id: "redeem-tx-1",
    type: "REDEEM" as const,
    amount: -6,
    sourceLoyaltyMode: null,
  },
};

const input = {
  customerId: "customer-1",
  businessId: "business-1",
  originalRedemptionId: "redemption-1",
  originalTransactionId: "redeem-tx-1",
  actor: owner,
  reason: "Reward fulfillment cancelled",
  idempotencyKey: "redemption-reversal-restore-1",
  restoreUnlock: true,
};

function createTransaction(options: {
  original?: typeof linkedOriginal;
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
  unlockUpdateCount?: number;
  existingRestoreUnlockRequested?: boolean;
} = {}) {
  const calls = {
    unlockUpdates: [] as unknown[],
    customerUpdates: [] as unknown[],
    reversals: [] as unknown[],
    activities: [] as unknown[],
  };

  const original = options.original ?? linkedOriginal;

  const transaction = {
    business: {
      findUnique: async () => ({
        staffAttributionEnabled: false,
        staffAttributionRequired: false,
      }),
    },
    customer: {
      updateMany: async (args: unknown) => {
        calls.customerUpdates.push(args);
        return { count: 1 };
      },
      findFirst: async () => ({ balance: 14 }),
    },
    rewardRedemption: {
      findFirst: async () => original,
    },
    rewardUnlock: {
      updateMany: async (args: unknown) => {
        calls.unlockUpdates.push(args);
        return { count: options.unlockUpdateCount ?? 1 };
      },
    },
    loyaltyTransaction: {
      findUnique: async () => options.existing ?? null,
      findFirst: async () => null,
      create: async (args: unknown) => {
        calls.reversals.push(args);
        return { id: "reversal-1" };
      },
    },
    businessActivity: {
      findFirst: async () => ({
        metadata: {
          unlockRestoreRequested:
            options.existingRestoreUnlockRequested ?? true,
        },
      }),
      create: async (args: unknown) => {
        calls.activities.push(args);
        return {};
      },
    },
    notification: {
      create: async () => ({}),
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
    $queryRaw: async () => [{ id: "customer-1" }],
  } as unknown as Prisma.TransactionClient;

  return { transaction, calls };
}

test("linked reward unlock restoration is atomic with the redemption reversal", async () => {
  const { transaction, calls } = createTransaction();

  const result = await recordRedemptionReversal(transaction, input);

  assert.deepEqual(result, {
    status: "APPLIED",
    balanceAfter: 14,
    transactionId: "reversal-1",
  });
  assert.deepEqual(calls.unlockUpdates, [
    {
      where: {
        id: "unlock-1",
        businessId: "business-1",
        customerId: "customer-1",
        rewardId: "reward-1",
        redeemedAt: { not: null },
        expiredAt: null,
      },
      data: { redeemedAt: null },
    },
  ]);
  assert.equal(calls.customerUpdates.length, 1);
  assert.equal(calls.reversals.length, 1);
  assert.equal(calls.activities.length, 1);
  assert.deepEqual(
    (calls.activities[0] as { data: { metadata: unknown } }).data.metadata,
    {
      operation: "REDEMPTION_REVERSAL",
      originalRedemptionId: "redemption-1",
      originalTransactionId: "redeem-tx-1",
      reversalTransactionId: "reversal-1",
      reversalKind: "REDEMPTION_REVERSAL",
      rewardId: "reward-1",
      rewardName: "Free coffee",
      rewardUnlockId: "unlock-1",
      amount: 6,
      reason: "Reward fulfillment cancelled",
      unlockRestoreRequested: true,
      unlockRestored: true,
      actorId: "owner-1",
      actorRole: "OWNER",
      idempotencyOutcome: "APPLIED",
    },
  );
});

test("legacy redemption without durable unlock provenance remains non-restorable", async () => {
  const { transaction, calls } = createTransaction({
    original: {
      ...linkedOriginal,
      rewardUnlockId: null as unknown as string,
      rewardUnlock: null as unknown as typeof linkedOriginal.rewardUnlock,
    },
  });

  const result = await recordRedemptionReversal(transaction, input);

  assert.deepEqual(result, {
    status: "BLOCKED",
    reason: "UNLOCK_RESTORE_UNSUPPORTED",
  });
  assert.equal(calls.unlockUpdates.length, 0);
  assert.equal(calls.customerUpdates.length, 0);
  assert.equal(calls.reversals.length, 0);
});

test("same operation ID replays when the exact linked unlock was already restored", async () => {
  const { transaction, calls } = createTransaction({
    original: {
      ...linkedOriginal,
      rewardUnlock: {
        ...linkedOriginal.rewardUnlock,
        redeemedAt: null as unknown as Date,
      },
    },
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
  assert.equal(calls.unlockUpdates.length, 0);
  assert.equal(calls.customerUpdates.length, 0);
});

test("same operation ID rejects a different unlock restoration intent", async () => {
  const { transaction } = createTransaction({
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

  await assert.rejects(
    () =>
      recordRedemptionReversal(transaction, {
        ...input,
        restoreUnlock: false,
      }),
    (error: unknown) => {
      assert.ok(isFinancialOperationConflictError(error));
      return true;
    },
  );
});
