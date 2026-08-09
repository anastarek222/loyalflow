import assert from "node:assert/strict";
import test from "node:test";

import { getOwnerOnboardingCopy } from "../lib/onboarding/owner-onboarding-copy";
import { validateOwnerOnboardingStep } from "../lib/onboarding/owner-onboarding-validation";

function validStepOne() {
  const form = new FormData();
  form.set("name", "LoyalFlow Cafe");
  form.set("country", "Egypt");
  form.set("currency", "EGP");
  form.set("timezone", "Africa/Cairo");
  form.set("contactPhone", "+201212312746");
  return form;
}

test("T006 onboarding wizard exposes matched Arabic and English navigation copy", () => {
  const en = getOwnerOnboardingCopy("en");
  const ar = getOwnerOnboardingCopy("ar");

  assert.equal(en.sections.length, 6);
  assert.equal(ar.sections.length, 6);
  assert.equal(en.sections[5], "Review & Launch");
  assert.equal(ar.sections[5], "المراجعة والإطلاق");
  assert.notEqual(en.saveProgress, ar.saveProgress);
  assert.notEqual(en.next, ar.next);
});

test("T006 inline owner onboarding validation follows the canonical page locale", () => {
  const enForm = validStepOne();
  enForm.set("name", "A");
  const arForm = validStepOne();
  arForm.set("name", "A");

  const enError = validateOwnerOnboardingStep(0, enForm, "en");
  const arError = validateOwnerOnboardingStep(0, arForm, "ar");

  assert.equal(enError?.field, "name");
  assert.equal(arError?.field, "name");
  assert.match(enError?.message ?? "", /business name/i);
  assert.match(arError?.message ?? "", /اسم نشاط/);
});

test("T006 locale does not change valid onboarding business semantics", () => {
  const en = validateOwnerOnboardingStep(0, validStepOne(), "en");
  const ar = validateOwnerOnboardingStep(0, validStepOne(), "ar");

  assert.equal(en, null);
  assert.equal(ar, null);
});
