import { randomUUID } from "node:crypto";

import { after } from "next/server";

import { scheduleNextIntegrationRecoveryHeartbeat } from "@/lib/server/integrations/reconciliation-heartbeat";
import { publishIntegrationJob } from "@/lib/server/integrations/transport";
import { processIntegrationJob } from "@/lib/server/integrations/worker";
import { logServerError } from "@/lib/server/logging";

type IntegrationJobScheduleDependencies = Readonly<{
  publishJob: typeof publishIntegrationJob;
  scheduleRecoveryHeartbeat: typeof scheduleNextIntegrationRecoveryHeartbeat;
  processJob: typeof processIntegrationJob;
  logError: typeof logServerError;
  createDeliveryId: () => string;
}>;

const defaultDependencies: IntegrationJobScheduleDependencies = {
  publishJob: publishIntegrationJob,
  scheduleRecoveryHeartbeat: scheduleNextIntegrationRecoveryHeartbeat,
  processJob: processIntegrationJob,
  logError: logServerError,
  createDeliveryId: randomUUID,
};

export type IntegrationJobPublishRecoveryResult = Readonly<{
  published: boolean;
  recoveryHeartbeatScheduled: boolean;
  inlineFallbackCompleted: boolean;
}>;

/**
 * Publishes the durable job wake-up and recovers locally if the first Queue
 * publication fails. The recovery heartbeat gives retryable inline failures a
 * later wake-up without changing the worker's lease/idempotency contract.
 */
export async function publishIntegrationJobWithRecovery(
  jobId: string,
  dependencies: IntegrationJobScheduleDependencies = defaultDependencies,
): Promise<IntegrationJobPublishRecoveryResult> {
  try {
    await dependencies.publishJob({ jobId });
    return {
      published: true,
      recoveryHeartbeatScheduled: false,
      inlineFallbackCompleted: false,
    };
  } catch (error) {
    dependencies.logError("integration_job_publish_failed", error, { jobId });
  }

  let recoveryHeartbeatScheduled = false;
  try {
    await dependencies.scheduleRecoveryHeartbeat();
    recoveryHeartbeatScheduled = true;
  } catch (error) {
    dependencies.logError("integration_recovery_heartbeat_seed_failed", error, {
      jobId,
    });
  }

  let inlineFallbackCompleted = false;
  try {
    await dependencies.processJob(
      jobId,
      `inline-fallback:${dependencies.createDeliveryId()}`,
    );
    inlineFallbackCompleted = true;
  } catch (error) {
    dependencies.logError("integration_job_inline_fallback_failed", error, {
      jobId,
    });
  }

  return {
    published: false,
    recoveryHeartbeatScheduled,
    inlineFallbackCompleted,
  };
}

/**
 * Wakes consumers only after the owning business transaction has committed.
 * Jobs remain durable in Postgres even if Queue publication temporarily fails.
 */
export function scheduleIntegrationJobs(jobIds: readonly (string | null)[]) {
  const uniqueJobIds = [
    ...new Set(jobIds.filter((jobId): jobId is string => Boolean(jobId))),
  ];
  if (uniqueJobIds.length === 0) return;

  after(async () => {
    await Promise.all(
      uniqueJobIds.map((jobId) => publishIntegrationJobWithRecovery(jobId)),
    );
  });
}

export function scheduleIntegrationJob(jobId: string | null) {
  scheduleIntegrationJobs([jobId]);
}
