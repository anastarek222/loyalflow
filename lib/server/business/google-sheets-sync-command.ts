import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import prisma from "@/lib/prisma";

export type GoogleSheetsSyncCommandResult =
  | Readonly<{ ok: false; reason: "SUBSCRIPTION_RESTRICTED" }>
  | Readonly<{
      ok: true;
      status: "success" | "failure";
    }>;

/**
 * Authoritative manual Google Sheets sync boundary.
 *
 * The command re-checks persisted OPERATE entitlement immediately before the
 * integration side effect, then delegates provider interaction and sync-state
 * recording to the existing safe sync helper.
 */
export async function syncBusinessGoogleSheetCommand(input: {
  businessId: string;
}): Promise<GoogleSheetsSyncCommandResult> {
  if (
    !(await canBusinessPerformSubscriptionOperation(
      prisma,
      input.businessId,
      "OPERATE",
    ))
  ) {
    return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" };
  }

  const result = await syncBusinessToGoogleSheetSafely(input.businessId);
  return { ok: true, status: result.status };
}
