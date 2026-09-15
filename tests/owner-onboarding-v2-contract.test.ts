import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("owner onboarding uses the four-step v2 contract", () => {
  const wizard = readFileSync(
    "components/owner-onboarding-wizard-v2.tsx",
    "utf8",
  );
  const page = readFileSync("app/onboarding/page.tsx", "utf8");

  assert.match(wizard, /OWNER_ONBOARDING_V2_STEP_COUNT = 4/);
  assert.match(wizard, /data-owner-step-panel="1"/);
  assert.match(wizard, /data-owner-step-panel="2"/);
  assert.match(wizard, /data-owner-step-panel="3"/);
  assert.match(wizard, /data-owner-step-panel="4"/);
  assert.doesNotMatch(wizard, /data-owner-step-panel="5"/);
  assert.doesNotMatch(wizard, /data-owner-step-panel="6"/);
  assert.match(page, /OwnerOnboardingWizardV2/);
});

test("owner onboarding review exposes product truth before launch", () => {
  const wizard = readFileSync(
    "components/owner-onboarding-wizard-v2.tsx",
    "utf8",
  );

  assert.match(wizard, /TRIAL_DURATION_DAYS/);
  assert.match(wizard, /review\.businessName/);
  assert.match(wizard, /review\.loyaltyMode/);
  assert.match(wizard, /review\.rewardName/);
  assert.match(wizard, /review\.rewardThreshold/);
  assert.match(wizard, /review\.primaryColor/);
  assert.match(wizard, /loyaltyMode === "POINTS"/);
  assert.match(wizard, /name="earnAmount" value="1"/);
});

test("switching to onboarding v2 does not remove the separate WhatsApp onboarding surface", () => {
  const page = readFileSync("app/onboarding/page.tsx", "utf8");

  assert.match(page, /OwnerWhatsAppOnboarding/);
  assert.match(page, /embeddedSignupReady=/);
});
