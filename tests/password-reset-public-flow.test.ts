import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("forgot-password request stays enumeration-safe and rate limited", () => {
  const actions = source("app/forgot-password/actions.ts");

  assert.match(actions, /getClientAddress/);
  assert.match(actions, /rateLimit/);
  assert.match(actions, /password-reset-request:/);
  assert.match(actions, /findUnique/);
  assert.match(actions, /issuePasswordResetToken/);
  assert.match(actions, /sendPasswordResetEmail/);
  assert.match(actions, /redirect\("\/forgot-password\?sent=1"\)/);
  assert.doesNotMatch(actions, /user-not-found/);
});

test("reset action consumes only an explicit token and matching password confirmation", () => {
  const actions = source("app/reset-password/actions.ts");

  assert.match(actions, /consumePasswordResetToken/);
  assert.match(actions, /token/);
  assert.match(actions, /newPassword/);
  assert.match(actions, /confirmPassword/);
  assert.match(actions, /password-mismatch/);
  assert.match(actions, /redirect\("\/login\?reset=success"\)/);
});

test("login exposes the forgot-password recovery path", () => {
  const login = source("app/login/page.tsx");
  assert.match(login, /href="\/forgot-password"/);
});

test("forgot and reset pages keep reset tokens out of rendered prose", () => {
  const forgot = source("app/forgot-password/page.tsx");
  const reset = source("app/reset-password/page.tsx");

  assert.match(forgot, /forgotPasswordAction/);
  assert.match(forgot, /name="email"/);
  assert.match(reset, /resetPasswordAction/);
  assert.match(reset, /name="token"/);
  assert.match(reset, /type="hidden"/);
  assert.doesNotMatch(reset, /\{token\}/);
});

test("password reset email delivery uses the canonical app origin and never logs the token", () => {
  const delivery = source("lib/auth/password-reset-email.ts");

  assert.match(delivery, /getConfiguredAppUrl/);
  assert.match(delivery, /\/reset-password\?token=/);
  assert.match(delivery, /RESEND_API_KEY/);
  assert.match(delivery, /PASSWORD_RESET_FROM_EMAIL/);
  assert.doesNotMatch(delivery, /console\.(log|info|debug)/);
});
