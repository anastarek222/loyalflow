export type CustomCardBackUploadCommandResult =
  | Readonly<{
      ok: true;
      version: string;
      frontUrl: string;
      backUrl: string;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "STORAGE_UNAVAILABLE"
        | "INVALID_UPLOAD"
        | "SUBSCRIPTION_RESTRICTED";
    }>;

/**
 * Legacy compatibility entry point.
 *
 * Custom Card artwork is an immutable Front + Back pair. A Back must never be
 * uploaded or replaced independently because doing so would create a version
 * that was not supplied as one reviewed pair by the Super Admin.
 *
 * Keep the exported symbol temporarily for old imports/tests, but fail closed.
 * The supported flow is uploadCustomCardCommand with Front + Back together.
 */
export async function uploadCustomCardBackCommand(input: {
  businessId: string;
  sourceVersion: string;
  back: unknown;
}): Promise<CustomCardBackUploadCommandResult> {
  void input;
  return { ok: false, reason: "INVALID_UPLOAD" };
}
