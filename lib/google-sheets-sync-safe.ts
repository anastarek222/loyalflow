import { syncBusinessToGoogleSheet } from "@/lib/google-sheets-sync";

export async function syncBusinessToGoogleSheetSafely(
  businessId: string
) {
  try {
    return await syncBusinessToGoogleSheet(businessId);
  } catch (error) {
    console.error(
      "[Google Sheets Sync Failed]",
      businessId,
      error
    );

    return null;
  }
}
