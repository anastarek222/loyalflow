import { Prisma, type ReversalKind } from "@/generated/prisma/client";
import type { ActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
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

type EarnReversalKind = Extract<ReversalKind, "EARN_REFUND" | "EARN_VOID">;

export type EarnReversalBlockReason =
  | "ORIGINAL_TRANSACTION_NOT_FOUND"
  | "ALREADY_FULLY_REVERSED"
  | "REVERSAL_EXCEEDS_ORIGINAL"
  | "SALE_AMOUNT_REQUIRED"
  | "UNEXPECTED_SALE_AMOUNT"
  | "SALE_REVERSAL_EXCEEDS_ORIGINAL"
  | "VOID_REQUIRES_FULL_ORIGINAL"
  | "INSUFFICIENT_BALANCE"
  | "SUBSCRIPTION_RESTRICTED";

export type EarnReversalResult =
  | {
      status: "APPLIED" | "REPLAYED";
      balanceAfter: number;
      transactionId: string;
    }
  | {
      status: "BLOCKED";
      reason: EarnReversalBlockReason;
    };

export type EarnReversalInput = {
  customerId: string;
  businessId: string;
  originalTransactionId: string;
  actor: FinancialOperationActor;
  branchId?: string;
  attributedStaffId?: string;
  activityContext?: ActivityRequestContext;
  kind: EarnReversalKind;
  amount: number;
  saleAmount?: number;
  reason: string;
  idempotencyKey: string;
};

function blocked(reason: EarnReversalBlockReason): EarnReversalResult {
  return { status: "BLOCKED", reason };
}

function validateInput(input: EarnReversalInput) {
  const reason = input.reason.trim();
  const idempotencyKey = input.idempotencyKey.trim();

  if (!Number.isInteger(input.amount) || input.amount < 1) {
    throw new Error("Earn reversal amount must be a positive integer.");
  }

  if (
    input.saleAmount !== undefined &&
    (!Number.isInteger(input.saleAmount) || input.saleAmount < 1)
  ) {
    throw new Error("Earn reversal sale amount must be a positive integer.");
  }

  if (reason.length < 1 || reason.length > 500) {
    throw new Error("Earn reversal reason must contain 1 to 500 characters.");
  }

  if (idempotencyKey.length < 1 || idempotencyKey.length > 200) {
    throw new Error("Earn reversal operation ID must contain 1 to 200 characters.");
  }

  return { reason, idempotencyKey };
}

function actorCanReverseEarn(actor: FinancialOperationActor, businessId: string) {
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

async function getExistingException(
  transaction: TransactionClient,
  businessId: string,
  operationId: string,
) {
  return transaction.reversalException.findUnique({
    where: {
      businessId_operationId: {
        businessId,
        operationId,
      },
    },
    select: {
      businessId: true,
      customerId: true,
      originalTransactionId: true,
      operationId: true,
      reversalKind: true,
      blockReason: true,
      attemptedAmount: true,
      attemptedSaleAmount: true,
      reason: true,
      actorId: true,
      actorRole: true,
      branchId: true,
      attributedStaffId: true,
    },
  });
}

type ExistingException = NonNullable<
  Awaited<ReturnType<typeof getExistingException>>
>;

function exceptionMatchesIntent(
  exception: ExistingException,
  input: EarnReversalInput,
  reason: string,
  operationId: string,
  branchId: string | undefined,
  attributedStaffId: string | undefined,
) {
  return (
    exception.businessId === input.businessId &&
    exception.customerId === input.customerId &&
    exception.originalTransactionId === input.originalTransactionId &&
    exception.operationId === operationId &&
    exception.reversalKind === input.kind &&
    exception.blockReason === "INSUFFICIENT_BALANCE" &&
    exception.attemptedAmount === input.amount &&
    exception.attemptedSaleAmount === (input.saleAmount ?? null) &&
    exception.reason === reason &&
    exception.actorId === input.actor.id &&
    exception.actorRole === input.actor.role &&
    exception.branchId === (branchId ?? null) &&
    exception.attributedStaffId === (attributedStaffId ?? null)
  );
}

async function persistInsufficientBalanceException(
  transaction: TransactionClient,
  input: EarnReversalInput,
  reason: string,
  operationId: string,
  availableBalance: number,
  branchId: string | undefined,
  attributedStaffId: string | undefined,
) {
  const exception = await transaction.reversalException.upsert({
    where: {
      businessId_operationId: {
        businessId: input.businessId,
        operationId,
      },
    },
    create: {
      businessId: input.businessId,
      customerId: input.customerId,
      originalTransactionId: input.originalTransactionId,
      operationId,
      reversalKind: input.kind,
      blockReason: "INSUFFICIENT_BALANCE",
      attemptedAmount: input.amount,
      ...(input.saleAmount !== undefined
        ? { attemptedSaleAmount: input.saleAmount }
        : {}),
      availableBalance,
      reason,
      actorId: input.actor.id,
      actorRole: input.actor.role,
      ...(branchId ? { branchId } : {}),
      ...(attributedStaffId ? { attributedStaffId } : {}),
    },
    update: {},
    select: {
      businessId: true,
      customerId: true,
      originalTransactionId: true,
      operationId: true,
      reversalKind: true,
      blockReason: true,
      attemptedAmount: true,
      attemptedSaleAmount: true,
      reason: true,
      actorId: true,
      actorRole: true,
      branchId: true,
      attributedStaffId: true,
    },
  });

  if (
    !exceptionMatchesIntent(
      exception,
      input,
      reason,
      operationId,
      branchId,
      attributedStaffId,
    )
  ) {
    throw new FinancialOperationConflictError();
  }
}

export async function recordEarnReversal(
  transaction: TransactionClient,
  input: EarnReversalInput,
): Promise<EarnReversalResult> {
  const { reason, idempotencyKey } = validateInput(input);

  if (!actorCanReverseEarn(input.actor, input.businessId)) {
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
    return blocked("ORIGINAL_TRANSACTION_NOT_FOUND");
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
      saleAmount: true,
      balanceAfter: true,
      reversalOfTransactionId: true,
      reversalKind: true,
      reversalReason: true,
    },
  });

  if (existing) {
    if (
      existing.businessId !== input.businessId ||
      existing.customerId !== input.customerId ||
      existing.type !== "REVERSAL" ||
      existing.amount !== -input.amount ||
      existing.saleAmount !== (input.saleAmount ?? null) ||
      existing.reversalOfTransactionId !== input.originalTransactionId ||
      existing.reversalKind !== input.kind ||
      existing.reversalReason !== reason
    ) {
      throw new FinancialOperationConflictError();
    }

    return {
      status: "REPLAYED",
      balanceAfter: existing.balanceAfter,
      transactionId: existing.id,
    };
  }

  const existingException = await getExistingException(
    transaction,
    input.businessId,
    idempotencyKey,
  );

  if (existingException) {
    if (
      !exceptionMatchesIntent(
        existingException,
        input,
        reason,
        idempotencyKey,
        operationContext.branchId,
        operationContext.attributedStaffId,
      )
    ) {
      throw new FinancialOperationConflictError();
    }

    return blocked("INSUFFICIENT_BALANCE");
  }

  if (
    !(await canBusinessPerformSubscriptionOperation(
      transaction,
      input.businessId,
      "OPERATE",
    ))
  ) {
    return blocked("SUBSCRIPTION_RESTRICTED");
  }

  const original = await transaction.loyaltyTransaction.findFirst({
    where: {
      id: input.originalTransactionId,
      businessId: input.businessId,
      customerId: input.customerId,
      type: "EARN",
    },
    select: {
      id: true,
      amount: true,
      saleAmount: true,
      sourceLoyaltyMode: true,
    },
  });

  if (!original || original.amount < 1) {
    return blocked("ORIGINAL_TRANSACTION_NOT_FOUND");
  }

  const priorReversals = await transaction.loyaltyTransaction.aggregate({
    where: {
      businessId: input.businessId,
      customerId: input.customerId,
      reversalOfTransactionId: original.id,
      type: "REVERSAL",
      reversalKind: { in: ["EARN_REFUND", "EARN_VOID"] },
    },
    _sum: {
      amount: true,
      saleAmount: true,
    },
  });

  const reversedAmount = Math.abs(priorReversals._sum?.amount ?? 0);
  const reversedSaleAmount = priorReversals._sum?.saleAmount ?? 0;
  const remainingAmount = original.amount - reversedAmount;

  if (remainingAmount <= 0) {
    return blocked("ALREADY_FULLY_REVERSED");
  }

  if (input.amount > remainingAmount) {
    return blocked("REVERSAL_EXCEEDS_ORIGINAL");
  }

  if (original.saleAmount !== null) {
    if (input.saleAmount === undefined) {
      return blocked("SALE_AMOUNT_REQUIRED");
    }

    if (reversedSaleAmount + input.saleAmount > original.saleAmount) {
      return blocked("SALE_REVERSAL_EXCEEDS_ORIGINAL");
    }
  } else if (input.saleAmount !== undefined) {
    return blocked("UNEXPECTED_SALE_AMOUNT");
  }

  if (
    input.kind === "EARN_VOID" &&
    (reversedAmount !== 0 ||
      input.amount !== original.amount ||
      (original.saleAmount !== null &&
        (reversedSaleAmount !== 0 || input.saleAmount !== original.saleAmount)))
  ) {
    return blocked("VOID_REQUIRES_FULL_ORIGINAL");
  }

  const updateResult = await transaction.customer.updateMany({
    where: {
      id: input.customerId,
      businessId: input.businessId,
      isActive: true,
      balance: { gte: input.amount },
    },
    data: {
      balance: { decrement: input.amount },
    },
  });

  if (updateResult.count !== 1) {
    const availableBalance = await getBalance(
      transaction,
      input.customerId,
      input.businessId,
    );

    if (availableBalance === null) {
      throw new FinancialOperationAbortedError();
    }

    await persistInsufficientBalanceException(
      transaction,
      input,
      reason,
      idempotencyKey,
      availableBalance,
      operationContext.branchId,
      operationContext.attributedStaffId,
    );

    return blocked("INSUFFICIENT_BALANCE");
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
      amount: -input.amount,
      balanceAfter,
      note:
        input.kind === "EARN_VOID"
          ? `Earn void: ${reason}`
          : `Earn refund: ${reason}`,
      sourceLoyaltyMode: original.sourceLoyaltyMode,
      ...(input.saleAmount !== undefined ? { saleAmount: input.saleAmount } : {}),
      idempotencyKey,
      reversalOfTransactionId: original.id,
      reversalKind: input.kind,
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

  const description =
    input.kind === "EARN_VOID"
      ? `تم إلغاء عملية رصيد ولاء بمقدار ${input.amount}. السبب: ${reason}`
      : `تم رد رصيد ولاء بمقدار ${input.amount}. السبب: ${reason}`;

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
        operation: "EARN_REVERSAL",
        originalTransactionId: original.id,
        reversalTransactionId: reversal.id,
        reversalKind: input.kind,
        amount: input.amount,
        saleAmount: input.saleAmount ?? null,
        reason,
        actorId: input.actor.id,
        actorRole: input.actor.role,
        idempotencyOutcome: "APPLIED",
      },
    },
  });

  await createBusinessNotification(transaction, {
    type: "BALANCE_ADJUSTED",
    title: input.kind === "EARN_VOID" ? "تم إلغاء رصيد ولاء" : "تم رد رصيد ولاء",
    message: description,
    businessId: input.businessId,
  });

  return {
    status: "APPLIED",
    balanceAfter,
    transactionId: reversal.id,
  };
}
