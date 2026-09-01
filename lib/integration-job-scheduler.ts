import { after } from "next/server";

import { publishIntegrationJob } from "@/lib/server/integrations/transport";
import { logServerError } from "@/lib/server/logging";

/**
 * Wakes consumers only after the owning business transaction has committed.
 * Jobs remain durable in Postgres even if queue publication temporarily fails.
 */
export function scheduleIntegrationJobs(jobIds: readonly (string | null)[]) {
  const uniqueJobIds = [...new Set(jobIds.filter((jobId): jobId is string => Boolean(jobId)))];
  if (uniqueJobIds.length === 0) return;

  after(async () => {
    await Promise.all(
      uniqueJobIds.map(async (jobId) => {
        try {
          await publishIntegrationJob({ jobId });
        } catch (error) {
          logServerError("integration_job_publish_failed", error, { jobId });
        }
      }),
    );
  });
}

export function scheduleIntegrationJob(jobId: string | null) {
  scheduleIntegrationJobs([jobId]);
}
