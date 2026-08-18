import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const publicCard = source("app/card/[token]/page.tsx");
const publicActions = source("components/customer-experience/public-card-actions.tsx");
const joinPage = source("app/join/[slug]/page.tsx");
const joinAction = source("app/join/[slug]/actions.ts");
const publicMembership = source(
  "lib/server/business/public-membership-command.ts",
);
const referralAction = source(
  "app/businesses/[slug]/customers/[customerId]/referral-actions.ts",
);
const referralCode = source("lib/referrals/code.ts");
const primaryQr = source("components/primary-business-join-qr.tsx");

test("Z7 Referral Lite reuses the canonical public join route for customer invites", () => {
  assert.match(publicCard, /canApplyPublicReferral\(business\.plan\)/);
  assert.match(publicCard, /customer\.referralCodes\[0\]/);
  assert.match(
    publicCard,
    /\/join\/\$\{business\.slug\}\?ref=\$\{customer\.referralCodes\[0\]\.code\}/,
  );
  assert.match(publicCard, /\{referralLink \? \(/);
  assert.match(publicCard, /Invite a friend/);
  assert.match(publicCard, /ShareLinkButton/);
  assert.match(publicCard, /CopyLinkButton/);
  assert.doesNotMatch(primaryQr, /[?&]ref=/);
});

test("Z7 referral input stays an optional overlay on the existing Instant Join writer", () => {
  assert.match(joinPage, /ref\?: string/);
  assert.match(joinPage, /canApplyPublicReferral\(business\.plan\)/);
  assert.match(joinPage, /normalizeReferralCode\(query\.ref\)/);
  assert.match(joinPage, /name="ref" value=\{appliedReferralCode\}/);
  assert.match(joinAction, /normalizeReferralCode/);
  assert.match(joinAction, /referralCode/);
  assert.match(joinAction, /createPublicMembershipCommand/);
  assert.match(
    joinAction,
    /redirect\(`\/card\/\$\{result\.customer\.publicToken\}\?welcome=1`\)/,
  );
});

test("Z7 records only entitled same-tenant active non-self referrals", () => {
  assert.match(publicMembership, /canApplyPublicReferral\(business\.plan\)/);
  assert.match(publicMembership, /businessId: input\.businessId/);
  assert.match(publicMembership, /customer: \{ isActive: true \}/);
  assert.match(publicMembership, /canRecordReferral\(/);
  assert.match(publicMembership, /transaction\.referral\.create/);
  assert.match(referralCode, /input\.referrerBusinessId === input\.businessId/);
  assert.match(
    referralCode,
    /input\.referrerCustomerId !== input\.referredCustomerId/,
  );
  assert.match(referralCode, /input\.referrerIsActive/);
});

test("Z7 referral-code issuance remains guarded and does not invent referral rewards", () => {
  assert.match(referralAction, /canUseCustomerReferrals/);
  assert.match(referralAction, /canPerformSubscriptionOperation/);
  assert.match(referralAction, /"EXPAND"/);
  assert.match(referralAction, /ensureCustomerReferralCodeCommand/);
  assert.match(referralAction, /revalidatePath\(`\/card\/\$\{publicToken\}`\)/);

  assert.doesNotMatch(publicMembership, /balance:\s*\{\s*(increment|decrement)/);
  assert.doesNotMatch(publicMembership, /rewardUnlock\.create/);
  assert.doesNotMatch(publicMembership, /transaction\.transaction\.create/);
  assert.doesNotMatch(publicActions, /referral|invite/i);
});
