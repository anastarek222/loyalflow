import { Prisma, type LoyaltyMode } from "@/generated/prisma/client";
import {
  resolveFinancialOperationContext,
  type FinancialOperationActor,
  type FinancialOperationContext,
} from "@/lib/loyalty/operation-context";
import { createBusinessNotification } from "@/lib/notifications";
import type { ActivityRequestContext } from "@/lib/activity/request-context";

type TransactionClient = Prisma.TransactionClient;

type EarnTransactionInput = {
  customerId: string;
  businessId: string;
  branchId?: string;
  createdById?: string;
  actor?: FinancialOperationActor;
  activityContext?: ActivityRequestContext;
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
  reportContextFailure?: boolean;
};

type RewardRedemptionInput = {
  customerId: string;
  businessId: string;
  branchId?: string;
  createdById?: string;
  actor?: FinancialOperationActor;
  activityContext?: ActivityRequestContext;
  attributedStaffId?: string;
  cost: number;
  rewardLabel: string;
  rewardName: string;
  rewardId?: string;
  unlockId?: string;
  idempotencyKey?: string;
  reportContextFailure?: boolean;
};

type BalanceAdjustmentInput = {
  customerId: string;
  businessId: string;
  branchId?: string;
  createdById?: string;
  actor?: FinancialOperationActor;
  activityContext?: ActivityRequestContext;
  attributedStaffId?: string;
  direction: "ADD" | "SUBTRACT";
  amount: number;
  reason: string;
  idempotencyKey?: string;
};

export class FinancialOperationConflictError extends Error {
  constructor() {
    super("This operation ID is already associated with different financial intent.");
    this.name = "FinancialOperationConflictError";
  }
}

export class FinancialOperationAbortedError extends Error {
  constructor() {
    super("The financial operation could not complete safely.");
    this.name = "FinancialOperationAbortedError";
  }
}

export class FinancialOperationContextError extends Error {
  constructor(
    readonly reason: Extract<FinancialOperationContext, { valid: false }> ["reason"],
  ) {
    super("The financial operation context is invalid.");
    this.name = "FinancialOperationContextError";
  }
}

export function isFinancialOperationConflictError(
  error: unknown,
): error is FinancialOperationConflictError {
  return error instanceof FinancialOperationConflictError;
}

export function isFinancialOperationAbortedError(
  error: unknown,
): error is FinancialOperationAbortedError {
  return error instanceof FinancialOperationAbortedError;
}

export function isFinancialOperationContextError(
  error: unknown,
): error is FinancialOperationContextError {
  return error instanceof FinancialOperationContextError;
}

async function getUpdatedBalance(
  transaction: TransactionClient,
  customerId: string,
  businessId: string,
) {
  const customer = await transaction.customer.findFirst({
    where: {
      id: customerId,
      businessId,
    },
    select: {
      balance: true,
    },
  });

  return customer?.balance ?? null;
}

async function lockCustomerBalance(
  transaction: TransactionClient,
  customerId: string,
  businessId: string,
) {
  const rows = await transaction.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT "id" FROM "Customer" WHERE "id" = ${customerId} AND "businessId" = ${businessId} FOR UPDATE`,
  );

  return rows.length === 1;
}

export async function recordLoyaltyEarn(
  transaction: TransactionClient,
  input: EarnTransactionInput,
) {
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

  const operationContext = await resolveFinancialOperationContext(transaction, {
    businessId: input.businessId,
    capability: "LOYALTY_EARN",
    actor: input.actor,
    branchId: input.branchId,
    attributedStaffId: input.attributedStaffId,
    legacyCreatedById: input.createdById,
  });

  if (!operationContext.valid) {
    if (input.reportContextFailure) {
      throw new FinancialOperationContextError(operationContext.reason);
    }
    return null;
  }

  if (!(await lockCustomerBalance(transaction, input.customerId, input.businessId))) {
    return null;
  }

  if (input.idempotencyKey) {
    const existing = await transaction.loyaltyTransaction.findUnique({
      where: {
        businessId_idempotencyKey: {
          businessId: input.businessId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: {
        businessId: true,
        customerId: true,
        type: true,
        amount: true,
        sourceLoyaltyMode: true,
        saleAmount: true,
        balanceAfter: true,
        promotionApplication: {
          select: {
            promotionId: true,
            baseAmount: true,
            bonusAmount: true,
          },
        },
      },
    });

    if (existing) {
      const promotionMatches = input.promotion
        ? existing.promotionApplication?.promotionId === input.promotion.id &&
          existing.promotionApplication.baseAmount === input.amount &&
          existing.promotionApplication.bonusAmount === promotionBonus
        : existing.promotionApplication === null;

      if (
        existing.businessId !== input.businessId ||
        existing.customerId !== input.customerId ||
        existing.type !== "EARN" ||
        existing.amount !== creditedAmount ||
        existing.sourceLoyaltyMode !== input.sourceLoyaltyMode ||
        existing.saleAmount !== (input.saleAmount ?? null) ||
        !promotionMatches
      ) {
        throw new FinancialOperationConflictError();
      }

      return existing.balanceAfter;
    }
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
      ...(operationContext.branchId ? { branchId: operationContext.branchId } : {}),
      createdById: operationContext.createdById,
      ...(operationContext.attributedStaffId
        ? { attributedStaffId: operationContext.attributedStaffId }
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
      ...(operationContext.branchId ? { branchId: operationContext.branchId } : {}),
      customerId: input.customerId,
      createdById: operationContext.createdById,
      ...(input.activityContext?.deviceName
        ? { deviceName: input.activityContext.deviceName }
        : {}),
      ...(input.activityContext?.ipAddress
        ? { ipAddress: input.activityContext.ipAddress }
        : {}),
    },
  });

  await createBusinessNotification(
    transaction,
    {
      type: "LOYALTY_EARNED",
      title: "تمت إضافة رصيد ولاء",
      message: input.activityDescription,
      businessId: input.businessId,
    }
  );

  return balanceAfter;
}

export async function recordRewardRedemption(
  transaction: TransactionClient,
  input: RewardRedemptionInput,
) {
  const operationContext = await resolveFinancialOperationContext(transaction, {
    businessId: input.businessId,
    capability: "LOYALTY_REDEEM",
    actor: input.actor,
    branchId: input.branchId,
    attributedStaffId: input.attributedStaffId,
    legacyCreatedById: input.createdById,
  });

  if (!operationContext.valid) {
    if (input.reportContextFailure) {
      throw new FinancialOperationContextError(operationContext.reason);
    }
    return null;
  }

  if (!(await lockCustomerBalance(transaction, input.customerId, input.businessId))) {
    return null;
  }

  if (input.idempotencyKey) {
    const existing = await transaction.loyaltyTransaction.findUnique({
      where: {
        businessId_idempotencyKey: {
          businessId: input.businessId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: {
        businessId: true,
        customerId: true,
        type: true,
        amount: true,
        balanceAfter: true,
        rewardRedemption: {
          select: {
            rewardId: true,
            cost: true,
          },
        },
      },
    });

    if (existing) {
      if (
        existing.businessId !== input.businessId ||
        existing.customerId !== input.customerId ||
        existing.type !== "REDEEM" ||
        existing.amount !== -input.cost ||
        existing.rewardRedemption?.rewardId !== (input.rewardId ?? null) ||
        existing.rewardRedemption?.cost !== input.cost
      ) {
        throw new FinancialOperationConflictError();
      }

      return existing.balanceAfter;
    }
  }

  if (input.unlockId) {
    const claim = await transaction.rewardUnlock.updateMany({
      where: {
        id: input.unlockId,
        businessId: input.businessId,
        customerId: input.customerId,
        ...(input.rewardId ? { rewardId: input.rewardId } : {}),
        redeemedAt: null,
        expiredAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        redeemedAt: new Date(),
      },
    });

    if (claim.count !== 1) {
      return null;
    }
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
    if (input.unlockId) {
      throw new FinancialOperationAbortedError();
    }
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

  const redeemedTransaction = await transaction.loyaltyTransaction.create({
    data: {
      type: "REDEEM",
      amount: -input.cost,
      balanceAfter,
      note: input.rewardLabel,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      customerId: input.customerId,
      businessId: input.businessId,
      ...(operationContext.branchId ? { branchId: operationContext.branchId } : {}),
      createdById: operationContext.createdById,
      ...(operationContext.attributedStaffId
        ? { attributedStaffId: operationContext.attributedStaffId }
        : {}),
    },
  });

  await transaction.rewardRedemption.create({
    data: {
      rewardName: input.rewardLabel,
      cost: input.cost,
      ...(input.rewardId ? { rewardId: input.rewardId } : {}),
      transactionId: redeemedTransaction.id,
      customerId: input.customerId,
      businessId: input.businessId,
      ...(operationContext.branchId ? { branchId: operationContext.branchId } : {}),
      createdById: operationContext.createdById,
      ...(operationContext.attributedStaffId
        ? { attributedStaffId: operationContext.attributedStaffId }
        : {}),
    },
  });

  await transaction.businessActivity.create({
    data: {
      type: "REWARD_REDEEMED",
      description: `تم استبدال ${input.rewardName} مقابل ${input.cost}`,
      businessId: input.businessId,
      ...(operationContext.branchId ? { branchId: operationContext.branchId } : {}),
      customerId: input.customerId,
      createdById: operationContext.createdById,
      ...(input.activityContext?.deviceName
        ? { deviceName: input.activityContext.deviceName }
        : {}),
      ...(input.activityContext?.ipAddress
        ? { ipAddress: input.activityContext.ipAddress }
        : {}),
    },
  });

  await createBusinessNotification(
    transaction,
    {
      type: "REWARD_REDEEMED",
      title: "تم استبدال مكافأة",
      message: `تم استبدال ${input.rewardName} مقابل ${input.cost}`,
      businessId: input.businessId,
    }
  );

  return balanceAfter;
}

export async function recordBalanceAdjustment(
  transaction: TransactionClient,
  input: BalanceAdjustmentInput,
) {
  const signedAmount = input.direction === "ADD" ? input.amount : -input.amount;

  const operationContext = await resolveFinancialOperationContext(transaction, {
    businessId: input.businessId,
    capability: "LOYALTY_ADJUST",
    actor: input.actor,
    branchId: input.branchId,
    attributedStaffId: input.attributedStaffId,
    legacyCreatedById: input.createdById,
  });

  if (!operationContext.valid) return null;

  if (!(await lockCustomerBalance(transaction, input.customerId, input.businessId))) {
    return null;
  }

  if (input.idempotencyKey) {
    const existing = await transaction.loyaltyTransaction.findUnique({
      where: {
        businessId_idempotencyKey: {
          businessId: input.businessId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: {
        businessId: true,
        customerId: true,
        type: true,
        amount: true,
        note: true,
        balanceAfter: true,
      },
    });

    if (existing) {
      if (
        existing.businessId !== input.businessId ||
        existing.customerId !== input.customerId ||
        existing.type !== "ADJUSTMENT" ||
        existing.amount !== signedAmount ||
        existing.note !== `تعديل يدوي: ${input.reason}`
      ) {
        throw new FinancialOperationConflictError();
      }

      return existing.balanceAfter;
    }
  }

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
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      customerId: input.customerId,
      businessId: input.businessId,
      ...(operationContext.branchId ? { branchId: operationContext.branchId } : {}),
      createdById: operationContext.createdById,
      ...(operationContext.attributedStaffId
        ? { attributedStaffId: operationContext.attributedStaffId }
        : {}),
    },
  });

  await transaction.businessActivity.create({
    data: {
      type: "BALANCE_ADJUSTED",
      description: `تم تعديل الرصيد بمقدار ${
        signedAmount > 0 ? "+" : ""
      }${signedAmount}. السبب: ${input.reason}`,
      businessId: input.businessId,
      ...(operationContext.branchId ? { branchId: operationContext.branchId } : {}),
      customerId: input.customerId,
      createdById: operationContext.createdById,
      ...(input.activityContext?.deviceName
        ? { deviceName: input.activityContext.deviceName }
        : {}),
      ...(input.activityContext?.ipAddress
        ? { ipAddress: input.activityContext.ipAddress }
        : {}),
    },
  });

  await createBusinessNotification(
    transaction,
    {
      type: "BALANCE_ADJUSTED",
      title: "تم تعديل رصيد عميل",
      message: `تم تعديل الرصيد بمقدار ${
        signedAmount > 0 ? "+" : ""
      }${signedAmount}. السبب: ${input.reason}`,
      businessId: input.businessId,
    }
  );

  return balanceAfter;
}
