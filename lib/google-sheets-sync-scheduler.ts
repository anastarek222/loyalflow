import { after } from "next/server";

import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";

/**
 * Schedules the optional Sheets mirror after the core response. The safe sync
 * helper records success/failure state and never throws back into Business
 * creation.
 */
export function scheduleBusinessGoogleSheetsSync(businessId: string) {
  after(async () => {
    await syncBusinessToGoogleSheetSafely(businessId);
  });
}
