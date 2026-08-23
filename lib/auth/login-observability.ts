export type LoginStage = "primary" | "authorize";

export type LoginDenialReason =
  | "invalid_input"
  | "rate_limited"
  | "account_unavailable"
  | "password_mismatch"
  | "email_unverified"
  | "credentials_rejected";

export function recordLoginDenial(
  stage: LoginStage,
  reason: LoginDenialReason,
) {
  console.warn({
    event: "login_denied",
    stage,
    reason,
  });
}
