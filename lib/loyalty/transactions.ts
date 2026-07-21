import type { LoyaltyMode, Prisma } from "@/generated/prisma/client";
import { validateStaffAttribution } from "@/lib/loyalty/staff-attribution";

type TransactionClient = Prisma.TransactionClient;

type EarnTransactionInput = {
  customerId: string;
  businessId: string;
  branchId?: string;
  createdById?: string;
  attributedStaffId?: string;
  amount: number;
  sourceLoyaltyMode: LoyaltyMode;
  saleAmount?: number;
  idempotencyKey?: string;
  promotion?: {
    id: string;
    businessId: string;
    bonusAmount: number;
  };
  transactionNote: string;
  activityDescription: string;
};

type RewardRedemptionInput = {
  customerId: string;
  businessId: string;
  branchId?: string;
  createdById?: string;
  cost: number;
  rewardLabel: string;
  rewardName: string;
  rewardId?: string;
};

type BalanceAdjustmentInput = {
  customerId: string;
  businessId: string;
  branchId?: string;
  createdById?: string;
  direction: "ADD" | "SUBTRACT";
  amount: number;
  reason: string;
};

async function getUpdatedBalance(
  transaction: TransactionClient,
  customerId: string,
  businessId: string,
) {
  const customer = await transaction.customer.findUnique({
    where: {
      id: customerId,
    },
    select: {
      balance: true,
      businessId: true,
    },
  });

  return customer?.businessId === businessId ? customer.balance : null;
}

async function hasActiveBranchContext(
  transaction: TransactionClient,
  businessId: string,
  branchId: string | undefined,
) {
  if (!branchId) return true;

  const branch = await transaction.branch.findFirst({
    where: {
      id: branchId,
      businessId,
      isActive: true,
    },
    select: { id: true },
  });

  return Boolean(branch);
}

export async function recordLoyaltyEarn(
  transaction: TransactionClient,
  input: EarnTransactionInput,
) {
  if (input.idempotencyKey) {
    const existing = await transaction.loyaltyTransaction.findUnique({
      where: {
        businessId_idempotencyKey: {
          businessId: input.businessId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: {
        customerId: true,
        balanceAfter: true,
      },
    });

    if (existing) {
      return existing.customerId === input.customerId
        ? existing.balanceAfter
        : null;
    }
  }

  if (
    !(await hasActiveBranchContext(
      transaction,
      input.businessId,
      input.branchId,
    ))
  ) {
    return null;
  }

  const staffAttribution = await validateStaffAttribution(transaction, {
    businessId: input.businessId,
    branchId: input.branchId,
    attributedStaffId: input.attributedStaffId,
  });

  if (!staffAttribution.valid) {
    return null;
  }

  const promotionBonus = input.promotion?.bonusAmount ?? 0;
  const creditedAmount = input.amount + promotionBonus;

  if (
    input.promotion &&
    (input.promotion.businessId !== input.businessId ||
      !Number.isInteger(promotionBonus) ||
      promotionBonus < 1)
  ) {
    throw new Error("Invalid promotion for loyalty earn.");
  }

  const updateResult = await transaction.customer.updateMany({
    where: {
      id: input.customerId,
      businessId: input.businessId,
      isActive: true,
    },
    data: {
      balance: {
        increment: creditedAmount,
      },
      lifetimeEarned: {
        increment: creditedAmount,
      },
    },
  });

  if (updateResult.count !== 1) {
    return null;
  }

  const balanceAfter = await getUpdatedBalance(
    transaction,
    input.customerId,
    input.businessId,
  );

  if (balanceAfter === null) {
    return null;
  }

  const earnedTransaction = await transaction.loyaltyTransaction.create({
    data: {
      type: "EARN",
      amount: creditedAmount,
      balanceAfter,
      note: input.transactionNote,
      sourceLoyaltyMode: input.sourceLoyaltyMode,
      ...(input.saleAmount ? { saleAmount: input.saleAmount } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      customerId: input.customerId,
      businessId: input.businessId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      createdById: input.createdById,
      ...(staffAttribution.attributedStaffId
        ? { attributedStaffId: staffAttribution.attributedStaffId }
        : {}),
    },
  });

  if (input.promotion) {
    await transaction.promotionApplication.create({
      data: {
        promotionId: input.promotion.id,
        businessId: input.businessId,
        customerId: input.customerId,
        transactionId: earnedTransaction.id,
        baseAmount: input.amount,
        bonusAmount: promotionBonus,
      },
    });
  }

  await transaction.businessActivity.create({
    data: {
      type: "LOYALTY_EARNED",
      description: input.activityDescription,
      businessId: input.businessId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      customerId: input.customerId,
      createdById: input.createdById,
    },
  });

  return balanceAfter;
}

export async function recordRewardRedemption(
  transaction: TransactionClient,
  input: RewardRedemptionInput,
) {
  if (
    !(await hasActiveBranchContext(
      transaction,
      input.businessId,
      input.branchId,
    ))
  ) {
    return null;
  }

  const updateResult = await transaction.customer.updateMany({
    where: {
      id: input.customerId,
      businessId: input.businessId,
      isActive: true,
      balance: {
        gte: input.cost,
      },
    },
    data: {
      balance: {
        decrement: input.cost,
      },
      lifetimeRedeemed: {
        increment: input.cost,
      },
    },
  });

  if (updateResult.count !== 1) {
    return null;
  }

  const balanceAfter = await getUpdatedBalance(
    transaction,
    input.customerId,
    input.businessId,
  );

  if (balanceAfter === null) {
    return null;
  }

  await transaction.loyaltyTransaction.create({
    data: {
      type: "REDEEM",
      amount: -input.cost,
      balanceAfter,
      note: input.rewardLabel,
      customerId: input.customerId,
      businessId: input.businessId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      createdById: input.createdById,
    },
  });

  await transaction.rewardRedemption.create({
    data: {
      rewardName: input.rewardLabel,
      cost: input.cost,
      ...(input.rewardId ? { rewardId: input.rewardId } : {}),
      customerId: input.customerId,
      businessId: input.businessId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      createdById: input.createdById,
    },
  });

  await transaction.businessActivity.create({
    data: {
      type: "REWARD_REDEEMED",
      description: `تم استبدال ${input.rewardName} مقابل ${input.cost}`,
      businessId: input.businessId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      customerId: input.customerId,
      createdById: input.createdById,
    },
  });

  return balanceAfter;
}

export async function recordBalanceAdjustment(
  transaction: TransactionClient,
  input: BalanceAdjustmentInput,
) {
  if (
    !(await hasActiveBranchContext(
      transaction,
      input.businessId,
      input.branchId,
    ))
  ) {
    return null;
  }

  const signedAmount = input.direction === "ADD" ? input.amount : -input.amount;

  const updateResult = await transaction.customer.updateMany({
    where: {
      id: input.customerId,
      businessId: input.businessId,
      isActive: true,
      ...(input.direction === "SUBTRACT"
        ? {
            balance: {
              gte: input.amount,
            },
          }
        : {}),
    },
    data: {
      balance:
        input.direction === "ADD"
          ? {
              increment: input.amount,
            }
          : {
              decrement: input.amount,
            },
    },
  });

  if (updateResult.count !== 1) {
    return null;
  }

  const balanceAfter = await getUpdatedBalance(
    transaction,
    input.customerId,
    input.businessId,
  );

  if (balanceAfter === null) {
    return null;
  }

  await transaction.loyaltyTransaction.create({
    data: {
      type: "ADJUSTMENT",
      amount: signedAmount,
      balanceAfter,
      note: `تعديل يدوي: ${input.reason}`,
      customerId: input.customerId,
      businessId: input.businessId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      createdById: input.createdById,
    },
  });

  await transaction.businessActivity.create({
    data: {
      type: "BALANCE_ADJUSTED",
      description: `تم تعديل الرصيد بمقدار ${
        signedAmount > 0 ? "+" : ""
      }${signedAmount}. السبب: ${input.reason}`,
      businessId: input.businessId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      customerId: input.customerId,
      createdById: input.createdById,
    },
  });

  return balanceAfter;
}
