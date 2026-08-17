import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getOwnerOnboardingValidationMessage,
  validateOwnerOnboardingStep,
  validateOwnerOnboardingThroughStep,
} from "@/lib/onboarding/owner-onboarding-validation";

function validForm() {
  return new FormData(Object.entries({
    name: "Demo Business",
    country: "Egypt",
    currency: "EGP",
    timezone: "Africa/Cairo",
    contactPhone: "+201212312746",
    loyaltyMode: "VISITS",
    unitName: "Visit",
    rewardName: "Reward",
    rewardThreshold: "5",
    earnAmount: "1",
  }));
}

test("P1 Owner Onboarding exposes stable localized validation codes", () => {
  const form = validForm();
  form.set("name", "A");
  const error = validateOwnerOnboardingStep(0, form, "en");
  assert.equal(error?.code, "BUSINESS_NAME_INVALID");
  assert.equal(error?.field, "name");
  assert.equal(error?.step, 0);
  assert.notEqual(
    getOwnerOnboardingValidationMessage("BUSINESS_NAME_INVALID", "en"),
    getOwnerOnboardingValidationMessage("BUSINESS_NAME_INVALID", "ar"),
  );
});

test("P1 Owner Onboarding validates loyalty and reward steps with canonical domain rules", () => {
  const loyalty = validForm();
  loyalty.set("unitName", "");
  assert.equal(validateOwnerOnboardingStep(1, loyalty, "en")?.code, "LOYALTY_UNIT_INVALID");

  const reward = validForm();
  reward.set("rewardThreshold", "0");
  assert.equal(validateOwnerOnboardingStep(2, reward, "ar")?.code, "REWARD_THRESHOLD_INVALID");
});

test("P1 Owner Onboarding forward validation returns the earliest exact invalid step and field", () => {
  const form = validForm();
  form.set("unitName", "");
  form.set("rewardThreshold", "0");
  const error = validateOwnerOnboardingThroughStep(2, form, "en");
  assert.equal(error?.step, 1);
  assert.equal(error?.field, "unitName");
  assert.equal(error?.code, "LOYALTY_UNIT_INVALID");
});

test("P1 Owner Onboarding desktop and mobile navigation use the forward-jump guard", () => {
  const wizard = readFileSync(
    new URL("../components/owner-onboarding-wizard.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    wizard.match(/onClick=\{\(\) => navigateToStep\(index\)\}/g)?.length,
    2,
  );
  assert.doesNotMatch(wizard, /onClick=\{\(\) => transitionToStep\(index\)\}/);
  assert.match(wizard, /validateOwnerOnboardingThroughStep\(\s*boundedStep - 1,/);
});

test("P1 Owner Onboarding guarded navigation returns to and focuses the exact invalid field", () => {
  const wizard = readFileSync(
    new URL("../components/owner-onboarding-wizard.tsx", import.meta.url),
    "utf8",
  );

  assert.match(wizard, /transitionToStep\(error\.step\)/);
  assert.match(wizard, /focusValidationField\(error\.field\)/);
  for (const field of [
    "loyaltyMode",
    "unitName",
    "rewardName",
    "rewardThreshold",
    "earnAmount",
  ]) {
    assert.match(wizard, new RegExp(`data-onboarding-field="${field}"`));
  }
});
