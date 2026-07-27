/**
 * Legacy tabs predate stable LoyalFlow mappings. This module intentionally only
 * plans a human-confirmed claim; callers must never infer ownership by title.
 */
export type LegacyGoogleSheet = { sheetId: number; title: string };

export type LegacySheetClaimPlan =
  | { allowed: false; reason: "BUSINESS_ALREADY_MAPPED" | "SHEET_NOT_FOUND" | "CONFIRMATION_REQUIRED" }
  | { allowed: true; sheetId: number; title: string };

export function planLegacyGoogleSheetClaim(input: {
  currentGoogleSheetId: number | null;
  selectedSheetId: number;
  availableSheets: readonly LegacyGoogleSheet[];
  confirmation: string | null | undefined;
}): LegacySheetClaimPlan {
  if (input.currentGoogleSheetId !== null) return { allowed: false, reason: "BUSINESS_ALREADY_MAPPED" };
  const selected = input.availableSheets.find((sheet) => sheet.sheetId === input.selectedSheetId);
  if (!selected) return { allowed: false, reason: "SHEET_NOT_FOUND" };
  if (input.confirmation !== "CLAIM_LEGACY_GOOGLE_SHEET") return { allowed: false, reason: "CONFIRMATION_REQUIRED" };
  return { allowed: true, sheetId: selected.sheetId, title: selected.title };
}
