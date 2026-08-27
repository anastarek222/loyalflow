import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const brandedEntrySurfaces = [
  "app/get-started/page.tsx",
  "app/login/page.tsx",
  "app/onboarding/page.tsx",
  "app/accept-owner-invitation/page.tsx",
  "app/forgot-password/page.tsx",
  "app/reset-password/page.tsx",
  "app/verify-email/page.tsx",
  "app/verify-email/resend/page.tsx",
  "app/mfa/setup/page.tsx",
] as const;

test("entry and auth surfaces consume the shared platform brand identity", () => {
  for (const path of brandedEntrySurfaces) {
    assert.match(source(path), /<PlatformBrandIdentity/);
  }
});

const bilingualAuthSurfaces = [
  "app/forgot-password/page.tsx",
  "app/reset-password/page.tsx",
  "app/verify-email/page.tsx",
  "app/verify-email/resend/page.tsx",
  "app/mfa/setup/page.tsx",
] as const;

test("recovery, verification, and MFA entry pages resolve locale and direction", () => {
  for (const path of bilingualAuthSurfaces) {
    const page = source(path);
    assert.match(page, /resolveRequestLocale/);
    assert.match(page, /getLocaleDirection/);
    assert.match(page, /<LanguageSwitcher/);
    assert.match(page, /lang=\{locale\}/);
    assert.match(page, /dir=\{direction\}/);
  }
});

test("reset password uses the canonical password policy authority", () => {
  const page = source("app/reset-password/page.tsx");
  assert.match(page, /MIN_PASSWORD_LENGTH/);
  assert.match(page, /MAX_PASSWORD_LENGTH/);
  assert.doesNotMatch(page, /minLength=\{10\}/);
  assert.doesNotMatch(page, /maxLength=\{128\}/);
});

test("MFA client form receives localized copy without changing its action boundary", () => {
  const page = source("app/mfa/setup/page.tsx");
  const form = source("app/mfa/setup/setup-form.tsx");

  assert.match(page, /<SuperAdminMfaSetupForm/);
  assert.match(page, /copy=\{\{/);
  assert.match(form, /beginMfaEnrollmentAction/);
  assert.match(form, /confirmMfaEnrollmentAction/);
  assert.match(form, /copy\.startError/);
  assert.match(form, /copy\.confirmError/);
});
