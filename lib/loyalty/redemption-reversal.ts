import { Prisma } from "@/generated/prisma/client";
import type { ActivityRequestContext } from "@/lib/activity/request-context";
import {
  resolveFinancialOperationContext,
  type FinancialOperationActor,
} from "@/lib/loyalty/operation-context";
import {
  FinancialOperationAbortedError,
  FinancialOperationConflictError,
  FinancialOperationContextError,
} from "@/lib/loyalty/transactions";
import { createBusinessNotification } from "@/lib/notifications";

type TransactionClient = Prisma.TransactionClient;

export type RedemptionReversalBlockReason =
  | "ORIGINAL_REDEMPTION_NOT_FOUND"
  | "ALREADY_REVERSED"
  | "UNLOCK_RESTORE_UNSUPPORTED";

export type RedemptionReversalResult =
  | {
      status: "APPLIED" | "REPLAYED";
      balanceAfter: number;
      transactionId: string;
    }
  | {
      status: "BLOCKED";
      reason: RedemptionReversalBlockReason;
    };

export type RedemptionReversalInput = {
  customerId: string;
  businessId: string;
  originalRedemptionId: string;
  originalTransactionId: string;
  actor: FinancialOperationActor;
  branchId?: string;
  attributedStaffId?: string;
  activityContext?: ActivityRequestContext;
  reason: string;
  idempotencyKey: string;
  restoreUnlock: boolean;
};

function blocked(reason: RedemptionReversalBlockReason): RedemptionReversalResult {
  return { status: "BLOCKED", reason };
}

function validateInput(input: RedemptionReversalInput) {
  const reason = input.reason.trim();
  const idempotencyKey = input.idempotencyKey.trim();

  if (reason.length < 1 || reason.length > 500) {
    throw new Error("Redemption reversal reason must contain 1 to 500 characters.");
  }

  if (idempotencyKey.length < 1 || idempotencyKey.length > 200) {
    throw new Error("Redemption reversal operation ID must contain 1 to 200 characters.");
  }

  return { reason, idempotencyKey };
}

function actorCanReverseRedemption(
  actor: FinancialOperationActor,
  businessId: string,
) {
  return (
    actor.role === "SUPER_ADMIN" ||
    (actor.role === "OWNER" && actor.businessId === businessId)
  );
}

async function lockCustomer(
  transaction: TransactionClient,
  customerId: string,
  businessId: string,
) {
  const rows = await transaction.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT "id" FROM "Customer" WHERE "id" = ${customerId} AND "businessId" = ${businessId} FOR UPDATE`,
  );

  return rows.length === 1;
}

async function getBalance(
  transaction: TransactionClient,
  customerId: string,
  businessId: string,
) {
  const customer = await transaction.customer.findFirst({
    where: { id: customerId, businessId },
    select: { balance: true },
  });

  return customer?.balance ?? null;
}

export async function recordRedemptionReversal(
  transaction: TransactionClient,
  input: RedemptionReversalInput,
): Promise<RedemptionReversalResult> {
  const { reason, idempotencyKey } = validateInput(input);

  if (!actorCanReverseRedemption(input.actor, input.businessId)) {
    throw new FinancialOperationContextError("ACTOR_NOT_ALLOWED");
  }

  const operationContext = await resolveFinancialOperationContext(transaction, {
    businessId: input.businessId,
    capability: "LOYALTY_ADJUST",
    actor: input.actor,
    branchId: input.branchId,
    attributedStaffId: input.attributedStaffId,
  });

  if (!operationContext.valid) {
    throw new FinancialOperationContextError(operationContext.reason);
  }

  if (!(await lockCustomer(transaction, input.customerId, input.businessId))) {
    return blocked("ORIGINAL_REDEMPTION_NOT_FOUND");
  }

  const original = await transaction.rewardRedemption.findFirst({
    where: {
      id: input.originalRedemptionId,
      businessId: input.businessId,
      customerId: input.customerId,
      transactionId: input.originalTransactionId,
    },
    select: {
      id: true,
      cost: true,
      rewardId: true,
      rewardName: true,
      rewardUnlockId: true,
      rewardUnlock: {
        select: {
          id: true,
          businessId: true,
          customerId: true,
          rewardId: true,
          redeemedAt: true,
          expiredAt: true,
        },
      },
      transaction: {
        select: {
          id: true,
          type: true,
          amount: true,
          sourceLoyaltyMode: true,
        },
      },
    },
  });

  if (
    !original ||
    !original.transaction ||
    original.cost < 1 ||
    original.transaction.type !== "REDEEM" ||
    original.transaction.amount !== -original.cost
  ) {
    return blocked("ORIGINAL_REDEMPTION_NOT_FOUND");
  }

  const existing = await transaction.loyaltyTransaction.findUnique({
    where: {
      businessId_idempotencyKey: {
        businessId: input.businessId,
        idempotencyKey,
      },
    },
    select: {
      id: true,
      businessId: true,
      customerId: true,
      type: true,
      amount: true,
      balanceAfter: true,
      reversalOfTransactionId: true,
      reversalKind: true,
      reversalReason: true,
    },
  });

  if (existing) {
    const linkedUnlockWasRestored =
      original.rewardUnlockId !== null &&
      original.rewardUnlock?.id === original.rewardUnlockId &&
      original.rewardUnlock.redeemedAt === null;

    if (
      existing.businessId !== input.businessId ||
      existing.customerId !== input.customerId ||
      existing.type !== "REVERSAL" ||
      existing.amount !== original.cost ||
      existing.reversalOfTransactionId !== original.transaction.id ||
      existing.reversalKind !== "REDEMPTION_REVERSAL" ||
      existing.reversalReason !== reason ||
      input.restoreUnlock !== linkedUnlockWasRestored
    ) {
      throw new FinancialOperationConflictError();
    }

    return {
      status: "REPLAYED",
      balanceAfter: existing.balanceAfter,
      transactionId: existing.id,
    };
  }

  if (input.restoreUnlock) {
    const unlock = original.rewardUnlock;
    const canRestoreUnlock =
      original.rewardUnlockId !== null &&
      unlock?.id === original.rewardUnlockId &&
      unlock.businessId === input.businessId &&
      unlock.customerId === input.customerId &&
      unlock.rewardId === original.rewardId &&
      unlock.redeemedAt !== null &&
      unlock.expiredAt === null;

    if (!canRestoreUnlock) {
      return blocked("UNLOCK_RESTORE_UNSUPPORTED");
    }
  }

  const priorReversal = await transaction.loyaltyTransaction.findFirst({
    where: {
      businessId: input.businessId,
      customerId: input.customerId,
      reversalOfTransactionId: original.transaction.id,
      type: "REVERSAL",
      reversalKind: "REDEMPTION_REVERSAL",
    },
    select: { id: true },
  });

  if (priorReversal) {
    return blocked("ALREADY_REVERSED");
  }

  if (input.restoreUnlock && original.rewardUnlockId) {
    const restoredUnlock = await transaction.rewardUnlock.updateMany({
      where: {
        id: original.rewardUnlockId,
        businessId: input.businessId,
        customerId: input.customerId,
        ...(original.rewardId ? { rewardId: original.rewardId } : {}),
        redeemedAt: { not: null },
        expiredAt: null,
      },
      data: {
        redeemedAt: null,
      },
    });

    if (restoredUnlock.count !== 1) {
      throw new FinancialOperationAbortedError();
    }
  }

  const updateResult = await transaction.customer.updateMany({
    where: {
      id: input.customerId,
      businessId: input.businessId,
      isActive: true,
    },
    data: {
      balance: { increment: original.cost },
    },
  });

  if (updateResult.count !== 1) {
    throw new FinancialOperationAbortedError();
  }

  const balanceAfter = await getBalance(
    transaction,
    input.customerId,
    input.businessId,
  );

  if (balanceAfter === null) {
    throw new FinancialOperationAbortedError();
  }

  const reversal = await transaction.loyaltyTransaction.create({
    data: {
      type: "REVERSAL",
      amount: original.cost,
      balanceAfter,
      note: `Redemption reversal: ${reason}`,
      sourceLoyaltyMode: original.transaction.sourceLoyaltyMode,
      idempotencyKey,
      reversalOfTransactionId: original.transaction.id,
      reversalKind: "REDEMPTION_REVERSAL",
      reversalReason: reason,
      customerId: input.customerId,
      businessId: input.businessId,
      ...(operationContext.branchId ? { branchId: operationContext.branchId } : {}),
      createdById: operationContext.createdById,
      ...(operationContext.attributedStaffId
        ? { attributedStaffId: operationContext.attributedStaffId }
        : {}),
    },
  });

  const unlockRestored = input.restoreUnlock && original.rewardUnlockId !== null;
  const description = `تم عكس استبدال ${original.rewardName} وإعادة ${original.cost} إلى رصيد الولاء. السبب: ${reason}`;

  await transaction.businessActivity.create({
    data: {
      type: "BALANCE_ADJUSTED",
      description,
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
      metadata: {
        operation: "REDEMPTION_REVERSAL",
        originalRedemptionId: original.id,
        originalTransactionId: original.transaction.id,
        reversalTransactionId: reversal.id,
        reversalKind: "REDEMPTION_REVERSAL",
        rewardId: original.rewardId,
        rewardName: original.rewardName,
        rewardUnlockId: original.rewardUnlockId,
        amount: original.cost,
        reason,
        unlockRestoreRequested: input.restoreUnlock,
        unlockRestored,
        actorId: input.actor.id,
        actorRole: input.actor.role,
        idempotencyOutcome: "APPLIED",
      },
    },
  });

  await createBusinessNotification(transaction, {
    type: "BALANCE_ADJUSTED",
    title: "تم عكس استبدال مكافأة",
    message: description,
    businessId: input.businessId,
  });

  return {
    status: "APPLIED",
    balanceAfter,
    transactionId: reversal.id,
  };
}
