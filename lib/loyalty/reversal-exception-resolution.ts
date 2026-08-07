import { Prisma } from "@/generated/prisma/client";
import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import {
  FinancialOperationAbortedError,
  FinancialOperationContextError,
} from "@/lib/loyalty/transactions";

type TransactionClient = Prisma.TransactionClient;

export type ReversalExceptionResolutionBlockReason =
  | "EXCEPTION_NOT_FOUND"
  | "ALREADY_RESOLVED";

export type ReversalExceptionResolutionResult =
  | {
      status: "APPLIED" | "REPLAYED";
      exceptionId: string;
      resolvedAt: Date;
    }
  | {
      status: "BLOCKED";
      reason: ReversalExceptionResolutionBlockReason;
    };

export type ReversalExceptionResolutionInput = {
  businessId: string;
  exceptionId: string;
  actor: FinancialOperationActor;
  resolutionNote: string;
};

function actorCanResolve(
  actor: FinancialOperationActor,
  businessId: string,
) {
  return (
    actor.role === "SUPER_ADMIN" ||
    (actor.role === "OWNER" && actor.businessId === businessId)
  );
}

function validateInput(input: ReversalExceptionResolutionInput) {
  const resolutionNote = input.resolutionNote.trim();

  if (input.businessId.length < 1 || input.businessId.length > 200) {
    throw new Error("Resolution business ID must contain 1 to 200 characters.");
  }

  if (input.exceptionId.length < 1 || input.exceptionId.length > 200) {
    throw new Error("Resolution exception ID must contain 1 to 200 characters.");
  }

  if (resolutionNote.length < 1 || resolutionNote.length > 500) {
    throw new Error("Resolution note must contain 1 to 500 characters.");
  }

  return { resolutionNote };
}

async function lockException(
  transaction: TransactionClient,
  exceptionId: string,
  businessId: string,
) {
  const rows = await transaction.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT "id" FROM "ReversalException" WHERE "id" = ${exceptionId} AND "businessId" = ${businessId} FOR UPDATE`,
  );

  return rows.length === 1;
}

export async function resolveReversalException(
  transaction: TransactionClient,
  input: ReversalExceptionResolutionInput,
): Promise<ReversalExceptionResolutionResult> {
  const { resolutionNote } = validateInput(input);

  if (!actorCanResolve(input.actor, input.businessId)) {
    throw new FinancialOperationContextError("ACTOR_NOT_ALLOWED");
  }

  if (!(await lockException(transaction, input.exceptionId, input.businessId))) {
    return {
      status: "BLOCKED",
      reason: "EXCEPTION_NOT_FOUND",
    };
  }

  const exception = await transaction.reversalException.findFirst({
    where: {
      id: input.exceptionId,
      businessId: input.businessId,
    },
    select: {
      id: true,
      status: true,
      resolvedAt: true,
      resolutionNote: true,
    },
  });

  if (!exception) {
    return {
      status: "BLOCKED",
      reason: "EXCEPTION_NOT_FOUND",
    };
  }

  if (exception.status === "RESOLVED") {
    if (
      exception.resolvedAt &&
      exception.resolutionNote === resolutionNote
    ) {
      return {
        status: "REPLAYED",
        exceptionId: exception.id,
        resolvedAt: exception.resolvedAt,
      };
    }

    return {
      status: "BLOCKED",
      reason: "ALREADY_RESOLVED",
    };
  }

  const resolvedAt = new Date();
  const updated = await transaction.reversalException.updateMany({
    where: {
      id: input.exceptionId,
      businessId: input.businessId,
      status: "OPEN",
    },
    data: {
      status: "RESOLVED",
      resolvedAt,
      resolutionNote,
    },
  });

  if (updated.count !== 1) {
    throw new FinancialOperationAbortedError();
  }

  return {
    status: "APPLIED",
    exceptionId: input.exceptionId,
    resolvedAt,
  };
}
