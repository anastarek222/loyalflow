import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import prisma from "@/lib/prisma";
import {
  claimIntegrationJob,
  completeIntegrationJob,
  failIntegrationJob,
} from "@/lib/server/integrations/outbox";
import { shouldRetryIntegrationFailure } from "@/lib/server/integrations/retry-policy";
import { sendWhatsAppCustomerNotificationSafely } from "@/lib/server/integrations/whatsapp-cloud";

const LEASE_DURATION_MS = 5 * 60 * 1000;

type IntegrationDeliveryResult =
  | Readonly<{ status: "success" }>
  | Readonly<{ status: "failure"; reason: string; retryable: boolean }>;

async function deliverClaimedJob(claimed: {
  kind: "GOOGLE_SHEETS_BUSINESS_SYNC" | "WHATSAPP_CUSTOMER_NOTIFICATION";
  businessId: string;
  payload: unknown;
}): Promise<IntegrationDeliveryResult> {
  if (claimed.kind === "GOOGLE_SHEETS_BUSINESS_SYNC") {
    return syncBusinessToGoogleSheetSafely(claimed.businessId);
  }
  if (claimed.kind === "WHATSAPP_CUSTOMER_NOTIFICATION") {
    return sendWhatsAppCustomerNotificationSafely(
      claimed.businessId,
      claimed.payload,
    );
  }
  return {
    status: "failure",
    reason: "UNSUPPORTED_INTEGRATION_JOB",
    retryable: false,
  };
}

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

  const result = await deliverClaimedJob(claimed);
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

  const retry = shouldRetryIntegrationFailure({
    retryable: result.retryable,
    attemptCount: claimed.attemptCount,
  });
  const failed = await failIntegrationJob(prisma, {
    jobId: claimed.id,
    workerId,
    failedAt: finishedAt,
    errorCode: result.reason,
    retryAt: retry ? new Date(finishedAt.getTime() + 1) : null,
  });
  if (failed.count !== 1) throw new Error("Integration job lease was lost.");
  if (retry) throw new Error("Retryable integration job failure.");
}
