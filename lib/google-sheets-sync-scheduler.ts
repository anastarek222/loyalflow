import { scheduleIntegrationJob } from "@/lib/integration-job-scheduler";

/** Backward-compatible wrapper for existing Google Sheets callers. */
export function scheduleBusinessGoogleSheetsSync(jobId: string) {
  scheduleIntegrationJob(jobId);
}
