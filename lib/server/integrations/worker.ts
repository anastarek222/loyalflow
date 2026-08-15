import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import prisma from "@/lib/prisma";
import {
  claimIntegrationJob,
  completeIntegrationJob,
  failIntegrationJob,
} from "@/lib/server/integrations/outbox";

const LEASE_DURATION_MS = 5 * 60 * 1000;

export async function processIntegrationJob(jobId: string, deliveryId: string) {
  const now = new Date();
  const workerId = `vercel-queue:${deliveryId}`;
  const claimed = await claimIntegrationJob(prisma, {
    jobId,
    workerId,
    now,
    leaseExpiresAt: new Date(now.getTime() + LEASE_DURATION_MS),
  });

  if (!claimed) return;
  if (claimed.kind !== "GOOGLE_SHEETS_BUSINESS_SYNC") {
    throw new Error("Unsupported integration job kind.");
  }

  const result = await syncBusinessToGoogleSheetSafely(claimed.businessId);
  const finishedAt = new Date();
  if (result.status === "success") {
    const completed = await completeIntegrationJob(prisma, {
      jobId: claimed.id,
      workerId,
      completedAt: finishedAt,
    });
    if (completed.count !== 1)
      throw new Error("Integration job lease was lost.");
    return;
  }

  const failed = await failIntegrationJob(prisma, {
    jobId: claimed.id,
    workerId,
    failedAt: finishedAt,
    errorCode: result.reason,
    retryAt: result.retryable ? new Date(finishedAt.getTime() + 1) : null,
  });
  if (failed.count !== 1) throw new Error("Integration job lease was lost.");
  if (result.retryable) throw new Error("Retryable integration job failure.");
}
