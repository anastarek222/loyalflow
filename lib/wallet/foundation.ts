/**
 * Phase V deliberately contains no persistence or phone matching. These pure
 * guards define the contract that a later additive identity/claim migration
 * must satisfy before a wallet can list any membership.
 */
export type WalletLinkStatus = "PENDING" | "LINKED" | "REVOKED";

export type FutureWalletMembership = {
  customerId: string;
  businessId: string;
  globalIdentityId: string | null;
  status: WalletLinkStatus;
};

export type VerifiedWalletSession = {
  globalIdentityId: string | null;
  isVerified: boolean;
};

export type WalletClaimInput = {
  session: VerifiedWalletSession;
  membership: FutureWalletMembership;
  explicitConsent: boolean;
};

export type WalletClaimDecision =
  | "AUTH_REQUIRED"
  | "CONSENT_REQUIRED"
  | "IDENTITY_CONFLICT"
  | "MEMBERSHIP_REVOKED"
  | "ALLOW_LINK";

/**
 * A matching phone, name, public card token, referral, or customer code is
 * never an input to this decision. Only a verified wallet session plus fresh,
 * explicit consent may establish a future link.
 */
export function evaluateWalletClaim({
  session,
  membership,
  explicitConsent,
}: WalletClaimInput): WalletClaimDecision {
  if (!session.isVerified || !session.globalIdentityId) return "AUTH_REQUIRED";
  if (!explicitConsent) return "CONSENT_REQUIRED";
  if (membership.status === "REVOKED") return "MEMBERSHIP_REVOKED";
  if (
    membership.globalIdentityId &&
    membership.globalIdentityId !== session.globalIdentityId
  ) {
    return "IDENTITY_CONFLICT";
  }
  return "ALLOW_LINK";
}

/** A wallet may show only explicitly linked, non-revoked memberships it owns. */
export function listExplicitWalletMemberships(
  session: VerifiedWalletSession,
  memberships: readonly FutureWalletMembership[]
) {
  if (!session.isVerified || !session.globalIdentityId) return [];

  return memberships
    .filter((membership) =>
      membership.status === "LINKED" &&
      membership.globalIdentityId === session.globalIdentityId
    )
    .map(({ customerId, businessId }) => ({ customerId, businessId }));
}

/** Existing bearer public-card tokens stay single-membership only. */
export function canPublicCardEnumerateWallet() {
  return false;
}

/** Guard against future convenience code reintroducing automatic phone joins. */
export function canAutomaticallyLinkByPhone() {
  return false;
}
