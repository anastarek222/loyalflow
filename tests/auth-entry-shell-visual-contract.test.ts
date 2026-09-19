import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const migratedRoutes = [
  "app/verify-email/page.tsx",
  "app/verify-email/resend/page.tsx",
  "app/forgot-password/page.tsx",
  "app/reset-password/page.tsx",
  "app/mfa/setup/page.tsx",
  "app/accept-owner-invitation/page.tsx",
] as const;

test("auth entry routes share one visual shell", () => {
  const shell = source("components/auth/auth-entry-shell.tsx");

  assert.match(shell, /data-auth-entry-shell/);
  assert.match(shell, /wordmarkClassName="h-7/);
  assert.match(shell, /LanguageSwitcher/);
  assert.match(shell, /themeAdaptiveWordmark/);
  assert.match(shell, /bg-surface/);

  for (const route of migratedRoutes) {
    const page = source(route);
    assert.match(page, /AuthEntryShell/);
    assert.doesNotMatch(page, /PlatformBrandIdentity/);
    assert.doesNotMatch(page, /auth-input/);
  }
});

test("MFA technical tracking opts out of Arabic tracking normalization", () => {
  const form = source("app/mfa/setup/setup-form.tsx");
  const foundation = source("app/frontend-foundation.css");
  const inlineBrand = source("components/brand/inline-tanee-name.tsx");

  assert.match(form, /data-preserve-latin-tracking/);
  assert.match(inlineBrand, /data-preserve-latin-tracking/);
  assert.match(foundation, /not\(\[data-preserve-latin-tracking\]\)/);
});
