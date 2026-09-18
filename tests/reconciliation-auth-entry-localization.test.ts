import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migratedAuthSurfaces = [
  "app/forgot-password/page.tsx",
  "app/reset-password/page.tsx",
  "app/verify-email/page.tsx",
  "app/verify-email/resend/page.tsx",
  "app/mfa/setup/page.tsx",
] as const;

test("reconciled recovery, verification, and MFA pages keep Tanee identity with AR/EN direction", () => {
  const shell = source("components/auth/auth-entry-shell.tsx");

  assert.match(shell, /<PlatformBrandIdentity/);
  assert.match(shell, /getLocaleDirection/);
  assert.match(shell, /<LanguageSwitcher/);
  assert.match(shell, /lang=\{locale\}/);
  assert.match(shell, /dir=\{direction\}/);

  for (const path of migratedAuthSurfaces) {
    const page = source(path);
    assert.match(page, /<AuthEntryShell/);
    assert.match(page, /locale=\{locale\}/);
    assert.match(page, /resolveRequestLocale/);
    assert.doesNotMatch(page, /auth-input/);
  }
});

test("reset password consumes the canonical password policy authority", () => {
  const page = source("app/reset-password/page.tsx");
  assert.match(page, /MIN_PASSWORD_LENGTH/);
  assert.match(page, /MAX_PASSWORD_LENGTH/);
  assert.doesNotMatch(page, /minLength=\{10\}/);
  assert.doesNotMatch(page, /maxLength=\{128\}/);
});

test("MFA localization preserves existing server-action boundaries", () => {
  const page = source("app/mfa/setup/page.tsx");
  const form = source("app/mfa/setup/setup-form.tsx");
  assert.match(page, /<SuperAdminMfaSetupForm/);
  assert.match(page, /copy=\{\{/);
  assert.match(form, /beginMfaEnrollmentAction/);
  assert.match(form, /confirmMfaEnrollmentAction/);
  assert.match(form, /copy\.startError/);
  assert.match(form, /copy\.confirmError/);
});

test("auth catalogs keep the Tanee brand name English in every locale", () => {
  const en = source("packages/i18n/src/locales/en/auth.ts");
  const ar = source("packages/i18n/src/locales/ar/auth.ts");
  assert.match(en, /Add Tanee to your authenticator/);
  assert.match(ar, /أضف Tanee إلى تطبيق المصادقة/);
  assert.doesNotMatch(en, /LoyalFlow/);
  assert.doesNotMatch(ar, /LoyalFlow|تاني/);
});
