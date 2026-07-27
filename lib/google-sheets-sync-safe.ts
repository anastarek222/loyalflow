import { getGoogleSheetsConfiguration, GoogleSheetsConfigurationError, GoogleSheetsReadinessError } from "@/lib/google-sheets";
import { GoogleSheetsSyncError, syncBusinessToGoogleSheet, type GoogleSheetsSyncFailureReason, type GoogleSheetsSyncResult } from "@/lib/google-sheets-sync";
import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";

function failureReason(error: unknown): GoogleSheetsSyncFailureReason {
  if (error instanceof GoogleSheetsConfigurationError || error instanceof GoogleSheetsReadinessError || error instanceof GoogleSheetsSyncError) return error.reason;
  return "GOOGLE_API_FAILED";
}

export async function syncBusinessToGoogleSheetSafely(businessId: string): Promise<GoogleSheetsSyncResult> {
  const configuration = getGoogleSheetsConfiguration();
  try {
    if (!configuration.configured) throw new GoogleSheetsConfigurationError(configuration.reason);
    const result = await syncBusinessToGoogleSheet(businessId);
    await prisma.business.update({ where: { id: businessId }, data: { googleSheetsSyncState: "SUCCEEDED", googleSheetsLastSyncedAt: new Date(), googleSheetsLastAttemptAt: new Date(), googleSheetsLastError: null, googleSheetsRetryable: false } });
    return result;
  } catch (error) {
    const reason = failureReason(error);
    const retryable = !(error instanceof GoogleSheetsSyncError) || error.retryable;
    logServerError("google_sheets_sync_failed", new Error(`Google Sheets sync failed: ${reason}`), { businessId, reason, retryable });
    try {
      await prisma.business.update({ where: { id: businessId }, data: { googleSheetsSyncState: "FAILED", googleSheetsLastAttemptAt: new Date(), googleSheetsLastError: reason, googleSheetsRetryable: retryable } });
    } catch (recordError) {
      logServerError("google_sheets_sync_failure_record_failed", recordError, { businessId });
    }
    return { status: "failure", businessId, reason, retryable };
  }
}
