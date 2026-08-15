import { after } from "next/server";

import { publishIntegrationJob } from "@/lib/server/integrations/transport";
import { logServerError } from "@/lib/server/logging";

/**
 * Publishes an already-committed durable job after the core response. The
 * business transaction owns durability; the transport only wakes a consumer.
 */
export function scheduleBusinessGoogleSheetsSync(jobId: string) {
  after(async () => {
    try {
      await publishIntegrationJob({ jobId });
    } catch (error) {
      logServerError("integration_job_publish_failed", error, { jobId });
    }
  });
}
