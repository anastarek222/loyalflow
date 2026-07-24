/**
 * Presentation context for the canonical loyalty actions. This is deliberately
 * not a return URL: only these fixed, internal destinations are supported.
 */
export const OPERATION_ORIGINS = ["CUSTOMER_PROFILE", "SCAN"] as const;

export type OperationOrigin = (typeof OPERATION_ORIGINS)[number];
export type ScanOperationError =
  | "invalid"
  | "permission"
  | "reward-unavailable"
  | "insufficient-balance"
  | "conflict"
  | "invalid-branch"
  | "invalid-staff"
  | "generic";

export function getOperationOrigin(formData?: FormData): OperationOrigin {
  // Missing or tampered values preserve the established profile behavior.
  const value = formData?.get("operationOrigin");
  return value === "SCAN" || value === "CUSTOMER_PROFILE"
    ? value
    : "CUSTOMER_PROFILE";
}

export function operationPresentationPath(
  origin: OperationOrigin,
  slug: string,
  customerId: string,
  state?: { success?: "earned" | "redeemed"; error?: ScanOperationError },
) {
  const basePath =
    origin === "SCAN"
      ? `/businesses/${slug}/scan/customer/${customerId}`
      : `/businesses/${slug}/customers/${customerId}`;

  if (!state) return basePath;
  if (state.success) return `${basePath}?success=${state.success}`;
  if (state.error) return `${basePath}?error=${state.error}`;
  return basePath;
}
