import type { Prisma } from "@/generated/prisma/client";

export type IntegrationJobStore = Pick<
  Prisma.TransactionClient,
  "integrationJob"
>;

export type EnqueueIntegrationJobInput = Readonly<{
  businessId: string;
  kind: "GOOGLE_SHEETS_BUSINESS_SYNC";
  idempotencyKey: string;
  availableAt?: Date;
}>;

export type ClaimIntegrationJobInput = Readonly<{
  jobId: string;
  workerId: string;
  now: Date;
  leaseExpiresAt: Date;
}>;

function requireBoundedIdentifier(value: string, name: string) {
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 200) {
    throw new Error(`${name} must contain between 1 and 200 characters.`);
  }
  return normalized;
}

function requireSafeErrorCode(value: string) {
  const normalized = value.trim();
  if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(normalized)) {
    throw new Error("errorCode must be a safe machine-readable code.");
  }
  return normalized;
}

/**
 * Creates one business-scoped durable job. Replaying the same key returns the
 * original row without resetting attempts, status, leases, or completion.
 */
export async function enqueueIntegrationJob(
  transaction: IntegrationJobStore,
  input: EnqueueIntegrationJobInput,
) {
  const businessId = requireBoundedIdentifier(input.businessId, "businessId");
  const idempotencyKey = requireBoundedIdentifier(
    input.idempotencyKey,
    "idempotencyKey",
  );

  return transaction.integrationJob.upsert({
    where: {
      businessId_kind_idempotencyKey: {
        businessId,
        kind: input.kind,
        idempotencyKey,
      },
    },
    create: {
      businessId,
      kind: input.kind,
      idempotencyKey,
      ...(input.availableAt ? { availableAt: input.availableAt } : {}),
    },
    update: {},
  });
}

/**
 * Atomically claims a ready or expired-lease job. The caller owns lease length;
 * this persistence boundary intentionally embeds no retry/backoff policy.
 */
export async function claimIntegrationJob(
  transaction: IntegrationJobStore,
  input: ClaimIntegrationJobInput,
) {
  const jobId = requireBoundedIdentifier(input.jobId, "jobId");
  const workerId = requireBoundedIdentifier(input.workerId, "workerId");
  if (input.leaseExpiresAt.getTime() <= input.now.getTime()) {
    throw new Error("leaseExpiresAt must be later than now.");
  }

  const claimed = await transaction.integrationJob.updateMany({
    where: {
      id: jobId,
      status: { in: ["PENDING", "FAILED", "PROCESSING"] },
      availableAt: { lte: input.now },
      OR: [
        { leaseExpiresAt: null },
        { leaseExpiresAt: { lte: input.now } },
      ],
    },
    data: {
      status: "PROCESSING",
      attemptCount: { increment: 1 },
      lastAttemptAt: input.now,
      leaseOwner: workerId,
      leaseExpiresAt: input.leaseExpiresAt,
      completedAt: null,
    },
  });

  if (claimed.count !== 1) return null;
  return transaction.integrationJob.findUnique({ where: { id: jobId } });
}

export async function completeIntegrationJob(
  transaction: IntegrationJobStore,
  input: Readonly<{ jobId: string; workerId: string; completedAt: Date }>,
) {
  return transaction.integrationJob.updateMany({
    where: {
      id: requireBoundedIdentifier(input.jobId, "jobId"),
      status: "PROCESSING",
      leaseOwner: requireBoundedIdentifier(input.workerId, "workerId"),
    },
    data: {
      status: "SUCCEEDED",
      completedAt: input.completedAt,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastErrorCode: null,
    },
  });
}

export async function failIntegrationJob(
  transaction: IntegrationJobStore,
  input: Readonly<{
    jobId: string;
    workerId: string;
    failedAt: Date;
    errorCode: string;
    retryAt: Date | null;
  }>,
) {
  const retryable = input.retryAt !== null;
  if (input.retryAt && input.retryAt.getTime() <= input.failedAt.getTime()) {
    throw new Error("retryAt must be later than failedAt.");
  }

  return transaction.integrationJob.updateMany({
    where: {
      id: requireBoundedIdentifier(input.jobId, "jobId"),
      status: "PROCESSING",
      leaseOwner: requireBoundedIdentifier(input.workerId, "workerId"),
    },
    data: {
      status: retryable ? "FAILED" : "DEAD",
      availableAt: input.retryAt ?? input.failedAt,
      lastErrorCode: requireSafeErrorCode(input.errorCode),
      completedAt: retryable ? null : input.failedAt,
      leaseOwner: null,
      leaseExpiresAt: null,
    },
  });
}
