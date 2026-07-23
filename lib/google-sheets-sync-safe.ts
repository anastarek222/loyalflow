import { syncBusinessToGoogleSheet } from "@/lib/google-sheets-sync";
import { validateRuntimeEnvironment } from "@/lib/server/environment";
import { logServerError } from "@/lib/server/logging";

export async function syncBusinessToGoogleSheetSafely(
  businessId: string
) {
  if (!validateRuntimeEnvironment().googleSheetsConfigured) {
    return null;
  }

  try {
    return await syncBusinessToGoogleSheet(businessId);
  } catch (error) {
    logServerError("google_sheets_sync_failed", error);

    return null;
  }
}
