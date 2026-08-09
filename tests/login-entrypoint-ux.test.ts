import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("regular sign-in keeps recovery available without exposing Super Admin second-factor controls", () => {
  const login = source("app/login/page.tsx");

  assert.match(login, /name="email"/);
  assert.match(login, /name="password"/);
  assert.match(login, /href="\/forgot-password"/);
  assert.match(login, /href="\/login\/super-admin"/);
  assert.doesNotMatch(login, /name="mfaCode"/);
  assert.doesNotMatch(login, /href="\/mfa\/setup"/);
  assert.doesNotMatch(login, /href="\/verify-email\/resend"/);
});

test("Super Admin sign-in owns the second factor and enrollment entrypoint", () => {
  const login = source("app/login/super-admin/page.tsx");

  assert.match(login, /name="email"/);
  assert.match(login, /name="password"/);
  assert.match(login, /name="mfaCode"/);
  assert.match(login, /required autoComplete="one-time-code"/);
  assert.match(login, /href="\/mfa\/setup"/);
  assert.match(login, /href="\/login"/);
  assert.match(login, /mfaEnabled/);
});

test("regular server action clears second-factor input while Super Admin action preserves its dedicated flow", () => {
  const actions = source("app/login/actions.ts");

  assert.match(actions, /formData\.set\("mfaCode", ""\)/);
  assert.match(actions, /runCredentialsSignIn\(formData, "\/login"\)/);
  assert.match(actions, /superAdminLoginAction/);
  assert.match(actions, /runCredentialsSignIn\(formData, "\/login\/super-admin"\)/);
});

test("successful MFA enrollment returns to the dedicated Super Admin sign-in page", () => {
  const actions = source("app/mfa/setup/actions.ts");

  assert.match(actions, /redirect\("\/login\/super-admin\?mfa=enabled"\)/);
  assert.doesNotMatch(actions, /redirect\("\/login\?mfa=enabled"\)/);
});
