/**
 * Untrusted transport input accepted by the public membership registration
 * boundary. Validation remains the responsibility of the consuming adapter.
 */
export type PublicMembershipRegistrationInput = Readonly<{
  firstName: unknown;
  lastName?: unknown;
  phone: unknown;
}>;

/** Canonical data produced after public membership input is validated. */
export type PublicMembershipRegistration = Readonly<{
  firstName: string;
  lastName?: string;
  phone: string;
}>;

/**
 * Stable public problem codes. The values intentionally retain the existing
 * query-string contract used by the join experience.
 */
export const publicMembershipRegistrationProblemCodes = {
  invalidInput: "invalid",
  businessUnavailable: "unavailable",
  rateLimited: "rate-limit",
  duplicateMembership: "duplicate",
  customerLimitReached: "plan-limit",
} as const;

export type PublicMembershipRegistrationProblemCode =
  (typeof publicMembershipRegistrationProblemCodes)[keyof typeof publicMembershipRegistrationProblemCodes];
