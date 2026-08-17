import type { Prisma } from "@/generated/prisma/client";

import { publishIntegrationJob } from "@/lib/server/integrations/transport";

export const BETA_RECONCILIATION_BATCH_LIMIT = 25;

export type IntegrationJobReconciliationStore = Pick<
  Prisma.TransactionClient,
  "integrationJob"
>;

export type IntegrationJobPublisher = (input: { jobId: string }) => Promise<void>;

export type ReconcileIntegrationJobsInput = Readonly<{
  now: Date;
  limit?: number;
}>;

function requireBatchLimit(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("Integration job reconciliation limit must be between 1 and 100.");
  }
  return value;
}

/**
 * Re-publishes only durable jobs that are currently eligible for another wake-up.
 * This does not claim a lease, mutate IntegrationJob state, or call a provider.
 * Duplicate wake-ups remain safe because the Queue message is job-idempotent and
 * the worker must acquire the PostgreSQL lease before provider execution.
 */
export async function reconcileStrandedIntegrationJobs(
  store: IntegrationJobReconciliationStore,
  input: ReconcileIntegrationJobsInput,
  publisher: IntegrationJobPublisher = publishIntegrationJob,
) {
  const limit = requireBatchLimit(input.limit ?? BETA_RECONCILIATION_BATCH_LIMIT);

  const jobs = await store.integrationJob.findMany({
    where: {
      availableAt: { lte: input.now },
      OR: [
        {
          status: { in: ["PENDING", "FAILED"] },
          OR: [
            { leaseExpiresAt: null },
            { leaseExpiresAt: { lte: input.now } },
          ],
        },
        {
          status: "PROCESSING",
          leaseExpiresAt: { lte: input.now },
        },
      ],
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true },
  });

  let published = 0;
  const failedJobIds: string[] = [];

  for (const job of jobs) {
    try {
      await publisher({ jobId: job.id });
      published += 1;
    } catch {
      failedJobIds.push(job.id);
    }
  }

  return {
    scanned: jobs.length,
    published,
    failedJobIds,
  } as const;
}
