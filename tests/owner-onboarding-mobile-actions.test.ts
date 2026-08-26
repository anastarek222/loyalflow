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

test("Super Admin Custom Setup keeps Back, Next, and Create reachable on phones", () => {
  const wizard = source("components/business-setup-wizard.tsx");

  assert.match(wizard, /data-business-setup-language=\{language\}/);
  assert.match(wizard, /data-testid="business-setup-mobile-action-bar"/);
  assert.match(wizard, /sticky bottom-0/);
  assert.match(wizard, /env\(safe-area-inset-bottom\)/);
  assert.match(wizard, /pb-24 sm:pb-0/);
  assert.match(wizard, /CreateBusinessSubmitButton/);
  assert.match(wizard, /min-h-12 w-full[\s\S]*?sm:ms-auto sm:w-auto/);
});

test("Sticky mobile actions preserve existing validation, save, launch, and create authority", () => {
  const owner = source("components/owner-onboarding-wizard.tsx");
  const business = source("components/business-setup-wizard.tsx");
  const browser = source("tests/browser/owner-onboarding-mobile.spec.ts");

  assert.match(owner, /onClick=\{goNext\}/);
  assert.match(owner, /formAction=\{launchAction\}/);
  assert.match(owner, /formAction=\{async \(formData\) =>/);
  assert.match(owner, /validateOwnerOnboardingStep\(step, formData, locale\)/);
  assert.match(owner, /focusValidationField\(error\.field\)/);

  assert.match(business, /onClick=\{goNext\}/);
  assert.match(business, /onClick=\{goBack\}/);
  assert.match(business, /getBusinessSetupValidationIssue\(formData, step as SetupStep\)/);
  assert.match(business, /action=\{action\}/);

  assert.match(browser, /owner-mobile-step-header/);
  assert.match(browser, /getByRole\("button", \{ name: "Next", exact: true \}\)/);
  assert.match(browser, /getByRole\("button", \{ name: "Launch", exact: true \}\)/);
  assert.match(browser, /getByRole\("button", \{ name: "Create business", exact: true \}\)/);
});
