import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("T006 login keeps one role-neutral entry page and reveals MFA conditionally", () => {
  const page = source("app/login/page.tsx");
  const form = source("app/login/login-form.tsx");

  assert.match(page, /<LoginForm/);
  assert.doesNotMatch(page, /name="mfaCode"/);
  assert.doesNotMatch(page, /<select[^>]*name=["']role["']/i);
  assert.match(form, /state\.status === "mfa-required"/);
  assert.match(form, /state\.status === "mfa-invalid"/);
  assert.match(form, /data-testid="login-mfa-step"/);
  assert.match(form, /name="mfaCode"/);
  assert.match(form, /name="loginStep"/);
});

test("T006 primary login step is rate limited and does not create a second session system", () => {
  const action = source("app/login/actions.ts");

  assert.match(action, /credentials-primary-step:/);
  assert.match(action, /distributedRateLimit/);
  assert.match(action, /compare\(parsed\.data\.password, user\.passwordHash\)/);
  assert.match(action, /isEmailVerificationSatisfied\(user\.id\)/);
  assert.match(action, /isSuperAdminMfaEnabled\(user\.id\)/);
  assert.match(action, /await signIn\("credentials", formData\)/);
  assert.match(action, /parsed\.data\.loginStep === "mfa" \? "mfa-invalid"/);
  assert.doesNotMatch(action, /prisma\.(session|account)\.(create|upsert)/i);
});

test("T006 login and conditional MFA copy remains bilingual", () => {
  const catalog = source("lib/i18n/catalog.ts");

  for (const key of [
    "auth.signInBody",
    "auth.invalid",
    "auth.mfaTitle",
    "auth.mfaBody",
    "auth.mfaSetupTitle",
    "auth.noRoleSelection",
  ]) {
    const occurrences = catalog.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} should exist once per locale`);
  }
});

test("T006 onboarding keeps the existing wizard actions inside the new responsive shell", () => {
  const page = source("app/onboarding/page.tsx");
  const wizard = source("components/owner-onboarding-wizard.tsx");

  assert.match(page, /saveAction=\{saveOwnerOnboardingAction\}/);
  assert.match(page, /launchAction=\{launchOwnerOnboardingAction\}/);
  assert.match(wizard, /lg:grid-cols-\[17rem_minmax\(0,1fr\)\]/);
  assert.match(wizard, /data-testid="owner-mobile-step-header"/);
  assert.match(wizard, /formAction=\{launchAction\}/);
  assert.match(wizard, /formAction=\{async \(formData\)/);
});
