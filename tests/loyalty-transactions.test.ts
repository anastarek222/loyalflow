import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../generated/prisma/client";
import {
  isFinancialOperationContextError,
  recordBalanceAdjustment,
  recordLoyaltyEarn,
  recordRewardRedemption,
} from "../lib/loyalty/transactions";

type RecordedCalls = {
  updateMany: unknown[];
  findUnique: unknown[];
  loyaltyTransactions: unknown[];
  promotionApplications: unknown[];
  rewardRedemptions: unknown[];
  activities: unknown[];
  notifications: unknown[];
  branches: unknown[];
};

function createTransaction(
  updateCount = 1,
  balance = 12,
  businessId = "business-1",
  existingEarn: {
    customerId: string;
    balanceAfter: number;
  } | null = null,
  activeBranch = true,
  staffAttributionEnabled = false,
  staffAttributionRequired = false,
  branchAssigned = true,
  attributedStaffExists = true,
) {
  const calls: RecordedCalls = {
    updateMany: [],
    findUnique: [],
    loyaltyTransactions: [],
    promotionApplications: [],
    rewardRedemptions: [],
    activities: [],
    notifications: [],
    branches: [],
  };

  const transaction = {
    business: {
      findUnique: async () => ({
        staffAttributionEnabled,
        staffAttributionRequired,
      }),
    },
    customer: {
      updateMany: async (args: unknown) => {
        calls.updateMany.push(args);
        return { count: updateCount };
      },
      findUnique: async (args: unknown) => {
        calls.findUnique.push(args);
        return { balance, businessId };
      },
      findFirst: async (args: unknown) => {
        calls.findUnique.push(args);
        return businessId === "business-1" ? { balance } : null;
      },
    },
    loyaltyTransaction: {
      findUnique: async () =>
        existingEarn
          ? {
              businessId,
              customerId: existingEarn.customerId,
              type: "EARN",
              amount: 2,
              sourceLoyaltyMode: "VISITS",
              saleAmount: null,
              balanceAfter: existingEarn.balanceAfter,
              promotionApplication: null,
            }
          : null,
      create: async (args: unknown) => {
        calls.loyaltyTransactions.push(args);
        return { id: "transaction-1" };
      },
    },
    promotionApplication: {
      create: async (args: unknown) => {
        calls.promotionApplications.push(args);
        return {};
      },
    },
    branch: {
      findFirst: async (args: unknown) => {
        calls.branches.push(args);
        return activeBranch ? { id: "branch-1" } : null;
      },
      count: async () => (activeBranch ? 1 : 0),
    },
    branchStaffAssignment: {
      findFirst: async () => (branchAssigned ? { id: "assignment-1" } : null),
    },
    user: {
      findFirst: async () =>
        attributedStaffExists ? { id: "staff-1", role: "STAFF" } : null,
    },
    rewardRedemption: {
      create: async (args: unknown) => {
        calls.rewardRedemptions.push(args);
        return {};
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
    $queryRaw: async () =>
      businessId === "business-1" ? [{ id: "customer-1" }] : [],
  } as unknown as Prisma.TransactionClient;

  return { transaction, calls };
}

test("earning updates balance and lifetime earned before recording the audit trail", async () => {
  const { transaction, calls } = createTransaction(1, 7);

  const balance = await recordLoyaltyEarn(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "staff-1",
    amount: 2,
    sourceLoyaltyMode: "VISITS",
    transactionNote: "Loyalty credit added",
    activityDescription: "Added 2 loyalty credit",
  });

  assert.equal(balance, 7);
  assert.deepEqual(calls.updateMany, [
    {
      where: {
        id: "customer-1",
        businessId: "business-1",
        isActive: true,
      },
      data: {
        balance: { increment: 2 },
        lifetimeEarned: { increment: 2 },
      },
    },
  ]);
  assert.deepEqual(calls.loyaltyTransactions, [
    {
      data: {
        type: "EARN",
        amount: 2,
        balanceAfter: 7,
        note: "Loyalty credit added",
        sourceLoyaltyMode: "VISITS",
        customerId: "customer-1",
        businessId: "business-1",
        createdById: "staff-1",
      },
    },
  ]);
  assert.equal(calls.activities.length, 1);
});

test("redemption prevents negative balances and records no follow-up writes when blocked", async () => {
  const { transaction, calls } = createTransaction(0);

  const balance = await recordRewardRedemption(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "staff-1",
    cost: 5,
    rewardLabel: "Free coffee",
    rewardName: "Free coffee",
  });

  assert.equal(balance, null);
  assert.deepEqual(calls.updateMany, [
    {
      where: {
        id: "customer-1",
        businessId: "business-1",
        isActive: true,
        balance: { gte: 5 },
      },
      data: {
        balance: { decrement: 5 },
        lifetimeRedeemed: { increment: 5 },
      },
    },
  ]);
  assert.equal(calls.findUnique.length, 0);
  assert.equal(calls.loyaltyTransactions.length, 0);
  assert.equal(calls.rewardRedemptions.length, 0);
  assert.equal(calls.activities.length, 0);
});

test("redemption records the balance change, reward, and audit activity", async () => {
  const { transaction, calls } = createTransaction(1, 1);

  const balance = await recordRewardRedemption(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "staff-1",
    cost: 5,
    rewardLabel: "20% off — VIP20",
    rewardName: "20% off",
    rewardId: "reward-1",
  });

  assert.equal(balance, 1);
  assert.deepEqual(calls.loyaltyTransactions, [
    {
      data: {
        type: "REDEEM",
        amount: -5,
        balanceAfter: 1,
        note: "20% off — VIP20",
        customerId: "customer-1",
        businessId: "business-1",
        createdById: "staff-1",
      },
    },
  ]);
  assert.deepEqual(calls.rewardRedemptions, [
    {
      data: {
        rewardName: "20% off — VIP20",
        cost: 5,
        rewardId: "reward-1",
        transactionId: "transaction-1",
        customerId: "customer-1",
        businessId: "business-1",
        createdById: "staff-1",
      },
    },
  ]);
  assert.deepEqual(calls.activities, [
    {
      data: {
        type: "REWARD_REDEEMED",
        description: "تم استبدال 20% off مقابل 5",
        businessId: "business-1",
        customerId: "customer-1",
        createdById: "staff-1",
      },
    },
  ]);
});

test("manual subtraction guards against insufficient balance and writes an auditable adjustment", async () => {
  const { transaction, calls } = createTransaction(1, 3);

  const balance = await recordBalanceAdjustment(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "owner-1",
    direction: "SUBTRACT",
    amount: 2,
    reason: "Duplicate visit",
  });

  assert.equal(balance, 3);
  assert.deepEqual(calls.updateMany, [
    {
      where: {
        id: "customer-1",
        businessId: "business-1",
        isActive: true,
        balance: { gte: 2 },
      },
      data: {
        balance: { decrement: 2 },
      },
    },
  ]);
  assert.deepEqual(calls.loyaltyTransactions, [
    {
      data: {
        type: "ADJUSTMENT",
        amount: -2,
        balanceAfter: 3,
        note: "تعديل يدوي: Duplicate visit",
        customerId: "customer-1",
        businessId: "business-1",
        createdById: "owner-1",
      },
    },
  ]);
  assert.equal(calls.activities.length, 1);
});

test("does not record tenant activity when the balance read has a different business", async () => {
  const { transaction, calls } = createTransaction(1, 12, "business-2");

  const balance = await recordLoyaltyEarn(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "staff-1",
    amount: 2,
    sourceLoyaltyMode: "VISITS",
    transactionNote: "Loyalty credit added",
    activityDescription: "Added 2 loyalty credit",
  });

  assert.equal(balance, null);
  assert.equal(calls.loyaltyTransactions.length, 0);
  assert.equal(calls.activities.length, 0);
});

test("records the immutable source mode and sale amount for sales earnings", async () => {
  const { transaction, calls } = createTransaction(1, 9);

  await recordLoyaltyEarn(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "staff-1",
    amount: 3,
    sourceLoyaltyMode: "SALES_AMOUNT",
    saleAmount: 250,
    transactionNote: "Sale recorded",
    activityDescription: "Added loyalty credit from sale",
  });

  assert.deepEqual(calls.loyaltyTransactions, [
    {
      data: {
        type: "EARN",
        amount: 3,
        balanceAfter: 9,
        note: "Sale recorded",
        sourceLoyaltyMode: "SALES_AMOUNT",
        saleAmount: 250,
        customerId: "customer-1",
        businessId: "business-1",
        createdById: "staff-1",
      },
    },
  ]);
});

test("records optional active branch context on loyalty writes and audit activity", async () => {
  const { transaction, calls } = createTransaction(1, 9);

  const balance = await recordLoyaltyEarn(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    branchId: "branch-1",
    amount: 3,
    sourceLoyaltyMode: "VISITS",
    transactionNote: "Branch earn",
    activityDescription: "Branch earn",
  });

  assert.equal(balance, 9);
  assert.deepEqual(calls.branches, [
    {
      where: { id: "branch-1", businessId: "business-1", isActive: true },
      select: { id: true },
    },
  ]);
  assert.deepEqual(calls.loyaltyTransactions[0], {
    data: {
      type: "EARN",
      amount: 3,
      balanceAfter: 9,
      note: "Branch earn",
      sourceLoyaltyMode: "VISITS",
      customerId: "customer-1",
      businessId: "business-1",
      branchId: "branch-1",
      createdById: undefined,
    },
  });
  assert.deepEqual(calls.activities[0], {
    data: {
      type: "LOYALTY_EARNED",
      description: "Branch earn",
      businessId: "business-1",
      branchId: "branch-1",
      customerId: "customer-1",
      createdById: undefined,
    },
  });
});

test("refuses an inactive or wrong-tenant branch before changing a balance", async () => {
  const { transaction, calls } = createTransaction(
    1,
    9,
    "business-1",
    null,
    false,
  );

  const balance = await recordRewardRedemption(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    branchId: "branch-other-tenant-or-inactive",
    cost: 3,
    rewardLabel: "Reward",
    rewardName: "Reward",
  });

  assert.equal(balance, null);
  assert.equal(calls.updateMany.length, 0);
  assert.equal(calls.loyaltyTransactions.length, 0);
  assert.equal(calls.rewardRedemptions.length, 0);
  assert.equal(calls.activities.length, 0);
});

test("credits an eligible promotion once and records its transaction audit link", async () => {
  const { transaction, calls } = createTransaction(1, 7);

  await recordLoyaltyEarn(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "staff-1",
    amount: 2,
    sourceLoyaltyMode: "VISITS",
    promotion: {
      id: "promotion-1",
      businessId: "business-1",
      bonusAmount: 3,
    },
    transactionNote: "Promotion earn",
    activityDescription: "Promotion earn",
  });

  assert.deepEqual(calls.updateMany[0], {
    where: {
      id: "customer-1",
      businessId: "business-1",
      isActive: true,
    },
    data: {
      balance: { increment: 5 },
      lifetimeEarned: { increment: 5 },
    },
  });
  assert.deepEqual(calls.promotionApplications, [
    {
      data: {
        promotionId: "promotion-1",
        businessId: "business-1",
        customerId: "customer-1",
        transactionId: "transaction-1",
        baseAmount: 2,
        bonusAmount: 3,
      },
    },
  ]);
});

test("returns the prior result for the same idempotency key without new writes", async () => {
  const { transaction, calls } = createTransaction(1, 7, "business-1", {
    customerId: "customer-1",
    balanceAfter: 9,
  });

  const balance = await recordLoyaltyEarn(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "staff-1",
    amount: 2,
    sourceLoyaltyMode: "VISITS",
    idempotencyKey: "a9cd3085-1429-4cac-8cf3-599ce4de2ac6",
    transactionNote: "Retry",
    activityDescription: "Retry",
  });

  assert.equal(balance, 9);
  assert.equal(calls.updateMany.length, 0);
  assert.equal(calls.loyaltyTransactions.length, 0);
  assert.equal(calls.promotionApplications.length, 0);
});

test("rejected staff branch or staff attribution context writes no financial side effects", async () => {
  const { transaction, calls } = createTransaction(
    1,
    9,
    "business-1",
    null,
    true,
    true,
    false,
    false,
  );

  const balance = await recordLoyaltyEarn(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    actor: { id: "actor-staff", role: "STAFF", businessId: "business-1" },
    branchId: "branch-1",
    attributedStaffId: "staff-1",
    amount: 2,
    sourceLoyaltyMode: "VISITS",
    transactionNote: "Rejected context",
    activityDescription: "Rejected context",
  });

  assert.equal(balance, null);
  assert.equal(calls.updateMany.length, 0);
  assert.equal(calls.loyaltyTransactions.length, 0);
  assert.equal(calls.rewardRedemptions.length, 0);
  assert.equal(calls.activities.length, 0);
  assert.equal(calls.notifications.length, 0);
});

test("context reporting is opt-in, bounded, and has no financial or audit side effects", async () => {
  const { transaction, calls } = createTransaction(
    1,
    9,
    "business-1",
    null,
    false,
  );

  await assert.rejects(
    recordLoyaltyEarn(transaction, {
      customerId: "customer-1",
      businessId: "business-1",
      branchId: "branch-other-tenant-or-inactive",
      amount: 2,
      sourceLoyaltyMode: "VISITS",
      transactionNote: "Rejected context",
      activityDescription: "Rejected context",
      reportContextFailure: true,
    }),
    (error: unknown) => {
      assert.equal(isFinancialOperationContextError(error), true);
      if (!isFinancialOperationContextError(error)) return false;
      assert.equal(error.reason, "INVALID_BRANCH");
      assert.match(error.message, /^The financial operation context is invalid\.$/);
      assert.doesNotMatch(error.message, /branch|staff|database/i);
      return true;
    },
  );

  assert.equal(calls.updateMany.length, 0);
  assert.equal(calls.loyaltyTransactions.length, 0);
  assert.equal(calls.promotionApplications.length, 0);
  assert.equal(calls.rewardRedemptions.length, 0);
  assert.equal(calls.activities.length, 0);
  assert.equal(calls.notifications.length, 0);
});

test("opting into context reporting does not turn unrelated aborts into context errors", async () => {
  const { transaction, calls } = createTransaction(0);

  const balance = await recordRewardRedemption(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "staff-1",
    cost: 5,
    rewardLabel: "Unavailable reward",
    rewardName: "Unavailable reward",
    reportContextFailure: true,
  });

  assert.equal(balance, null);
  assert.equal(calls.updateMany.length, 1);
  assert.equal(calls.loyaltyTransactions.length, 0);
  assert.equal(calls.rewardRedemptions.length, 0);
  assert.equal(calls.activities.length, 0);
  assert.equal(calls.notifications.length, 0);
});

test("successful redemptions persist canonical branch, actor, and staff attribution", async () => {
  const { transaction, calls } = createTransaction(
    1,
    6,
    "business-1",
    null,
    true,
    true,
    false,
    true,
    true,
  );

  const balance = await recordRewardRedemption(transaction, {
    customerId: "customer-1",
    businessId: "business-1",
    actor: { id: "actor-staff", role: "STAFF", businessId: "business-1" },
    branchId: "branch-1",
    attributedStaffId: "staff-1",
    cost: 2,
    rewardLabel: "Context reward",
    rewardName: "Context reward",
  });

  assert.equal(balance, 6);
  assert.deepEqual(calls.loyaltyTransactions[0], {
    data: {
      type: "REDEEM",
      amount: -2,
      balanceAfter: 6,
      note: "Context reward",
      customerId: "customer-1",
      businessId: "business-1",
      branchId: "branch-1",
      createdById: "actor-staff",
      attributedStaffId: "staff-1",
    },
  });
  assert.deepEqual(calls.rewardRedemptions[0], {
    data: {
      rewardName: "Context reward",
      cost: 2,
      transactionId: "transaction-1",
      customerId: "customer-1",
      businessId: "business-1",
      branchId: "branch-1",
      createdById: "actor-staff",
      attributedStaffId: "staff-1",
    },
  });
  assert.deepEqual(calls.activities[0], {
    data: {
      type: "REWARD_REDEEMED",
      description: "تم استبدال Context reward مقابل 2",
      businessId: "business-1",
      branchId: "branch-1",
      customerId: "customer-1",
      createdById: "actor-staff",
    },
  });
});
