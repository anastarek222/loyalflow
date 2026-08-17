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
  const existing = action.indexOf("prisma.customerReferralCode.findUnique");
  const preflight = action.indexOf("canPerformSubscriptionOperation");
  const commandCall = action.indexOf("ensureCustomerReferralCodeCommand({");
  assert.ok(existing >= 0 && preflight > existing && commandCall > preflight);
  assert.match(action, /!existing/);
  assert.match(action, /"EXPAND"/);
});

test("TC5 bounded referral action maps command outcomes without owning persistence", () => {
  assert.match(action, /ensureCustomerReferralCodeCommand\(/);
  assert.match(action, /SUBSCRIPTION_RESTRICTED/);
  assert.match(action, /CREATE_FAILED/);
  assert.match(action, /success=referral-link/);
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /transaction\.customerReferralCode\.create/);
  assert.match(command, /error\.code === "P2002"/);
});
