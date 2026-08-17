import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const action = source(
  "app/businesses/[slug]/customers/[customerId]/referral-actions.ts",
);
const command = source(
  "lib/server/business/customer-referral-code-command.ts",
);

const actionStart = action.indexOf(
  "export async function createCustomerReferralCodeCommandAction",
);
assert.ok(actionStart >= 0);
const referralAction = action.slice(actionStart);

test("TC5 bounded referral action re-establishes server authority before command delegation", () => {
  assert.match(action, /await auth\(\)/);
  assert.match(action, /opaqueIdSchema\.safeParse/);
  assert.match(action, /prisma\.business\.findUnique/);
  assert.match(action, /canUseCustomerReferrals/);
  assert.match(action, /prisma\.customer\.findFirst/);
  assert.match(action, /businessId: business\.id/);
  assert.doesNotMatch(action, /prisma\.\$transaction/);
  assert.doesNotMatch(action, /transaction\.customerReferralCode\.create/);
});

test("TC5 bounded referral action preserves existing-code replay before presentation EXPAND preflight", () => {
  const existing = referralAction.indexOf(
    "prisma.customerReferralCode.findUnique",
  );
  const preflight = referralAction.indexOf("canPerformSubscriptionOperation");
  const commandCall = referralAction.indexOf(
    "ensureCustomerReferralCodeCommand({",
  );
  assert.ok(existing >= 0 && preflight > existing && commandCall > preflight);
  assert.match(referralAction, /!existing/);
  assert.match(referralAction, /"EXPAND"/);
});

test("TC5 bounded referral action maps command outcomes without owning persistence", () => {
  assert.match(referralAction, /ensureCustomerReferralCodeCommand\(/);
  assert.match(referralAction, /SUBSCRIPTION_RESTRICTED/);
  assert.match(referralAction, /CREATE_FAILED/);
  assert.match(referralAction, /success=referral-link/);
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /transaction\.customerReferralCode\.create/);
  assert.match(command, /error\.code === "P2002"/);
});
