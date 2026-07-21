import assert from "node:assert/strict";
import test from "node:test";

import {
  canAutomaticallyLinkByPhone,
  canPublicCardEnumerateWallet,
  evaluateWalletClaim,
  listExplicitWalletMemberships,
  type FutureWalletMembership,
} from "../lib/wallet/foundation";

const memberships: FutureWalletMembership[] = [
  { customerId: "coffee-customer", businessId: "coffee", globalIdentityId: "identity-a", status: "LINKED" },
  { customerId: "barber-customer", businessId: "barber", globalIdentityId: "identity-a", status: "LINKED" },
  { customerId: "retail-customer", businessId: "retail", globalIdentityId: "identity-b", status: "LINKED" },
  { customerId: "revoked-customer", businessId: "gym", globalIdentityId: "identity-a", status: "REVOKED" },
  { customerId: "pending-customer", businessId: "salon", globalIdentityId: null, status: "PENDING" },
];

test("same phones across businesses never create an automatic global link", () => {
  assert.equal(canAutomaticallyLinkByPhone(), false);
  assert.equal(
    evaluateWalletClaim({
      session: { globalIdentityId: "identity-a", isVerified: true },
      membership: memberships[4],
      explicitConsent: false,
    }),
    "CONSENT_REQUIRED"
  );
});

test("only a verified explicit identity link can list that customer wallet membership", () => {
  assert.deepEqual(
    listExplicitWalletMemberships({ globalIdentityId: "identity-a", isVerified: true }, memberships),
    [
      { customerId: "coffee-customer", businessId: "coffee" },
      { customerId: "barber-customer", businessId: "barber" },
    ]
  );
  assert.deepEqual(
    listExplicitWalletMemberships({ globalIdentityId: null, isVerified: false }, memberships),
    []
  );
});

test("unauthorized sessions, revoked memberships, and identity claim conflicts are refused", () => {
  assert.equal(
    evaluateWalletClaim({ session: { globalIdentityId: null, isVerified: false }, membership: memberships[4], explicitConsent: true }),
    "AUTH_REQUIRED"
  );
  assert.equal(
    evaluateWalletClaim({ session: { globalIdentityId: "identity-a", isVerified: true }, membership: memberships[3], explicitConsent: true }),
    "MEMBERSHIP_REVOKED"
  );
  assert.equal(
    evaluateWalletClaim({ session: { globalIdentityId: "identity-a", isVerified: true }, membership: memberships[2], explicitConsent: true }),
    "IDENTITY_CONFLICT"
  );
});

test("wallet projections retain tenant privacy and public cards cannot enumerate a wallet", () => {
  const projection = listExplicitWalletMemberships({ globalIdentityId: "identity-a", isVerified: true }, memberships);
  assert.deepEqual(Object.keys(projection[0]).sort(), ["businessId", "customerId"]);
  assert.equal(canPublicCardEnumerateWallet(), false);
});
