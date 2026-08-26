import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("Owner onboarding keeps primary actions reachable on phone viewports", () => {
  const wizard = source("components/owner-onboarding-wizard.tsx");

  assert.match(wizard, /data-testid="owner-mobile-action-bar"/);
  assert.match(wizard, /sticky bottom-0/);
  assert.match(wizard, /env\(safe-area-inset-bottom\)/);
  assert.match(wizard, /sm:static/);
  assert.match(wizard, /pb-28 sm:p-8 sm:pb-8 lg:p-10/);
  assert.match(wizard, /overflow-clip rounded-3xl/);
  assert.doesNotMatch(wizard, /max-w-6xl overflow-hidden rounded-3xl/);
});

test("Sticky mobile actions preserve the existing validation and launch authority", () => {
  const wizard = source("components/owner-onboarding-wizard.tsx");
  const browser = source("tests/browser/owner-onboarding-mobile.spec.ts");

  assert.match(wizard, /onClick=\{goNext\}/);
  assert.match(wizard, /formAction=\{launchAction\}/);
  assert.match(wizard, /formAction=\{async \(formData\) =>/);
  assert.match(wizard, /validateOwnerOnboardingStep\(step, formData, locale\)/);
  assert.match(wizard, /focusValidationField\(error\.field\)/);
  assert.match(browser, /owner-mobile-step-header/);
  assert.match(browser, /getByRole\("button", \{ name: "Next", exact: true \}\)/);
  assert.match(browser, /getByRole\("button", \{ name: "Launch", exact: true \}\)/);
});
