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
  assert.match(actions, /distributedRateLimit/);
  assert.match(actions, /password-reset-request:/);
  assert.match(actions, /findUnique/);
  assert.match(actions, /issuePasswordResetToken/);
  assert.match(actions, /sendPasswordResetEmail/);
  assert.match(actions, /redirect\("\/forgot-password\?sent=1"\)/);
  assert.doesNotMatch(actions, /user-not-found/);
});

test("forgot-password delivery failure remains private and returns the generic response", () => {
  const actions = source("app/forgot-password/actions.ts");

  assert.match(actions, /try\s*\{/);
  assert.match(actions, /issuePasswordResetToken/);
  assert.match(actions, /sendPasswordResetEmail/);
  assert.match(actions, /catch\s*\(error\)/);
  assert.match(actions, /logServerError\(\s*"password_reset_request_delivery_failed"/);
  assert.match(actions, /redirect\("\/forgot-password\?sent=1"\)/);
  assert.doesNotMatch(actions, /user-not-found|not-configured|delivery-failed/i);
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
  const login = [
    source("app/login/page.tsx"),
    source("app/login/login-form.tsx"),
  ].join("\n");
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

test("password reset email delivery uses the canonical app origin and verified Tanee sender", () => {
  const delivery = source("lib/auth/password-reset-email.ts");
  const sender = source("lib/auth/auth-email-sender.ts");

  assert.match(delivery, /getConfiguredAppUrl/);
  assert.match(delivery, /\/reset-password\?token=/);
  assert.match(delivery, /RESEND_API_KEY/);
  assert.match(delivery, /resolveTaneeAuthEmailSender/);
  assert.doesNotMatch(delivery, /PASSWORD_RESET_FROM_EMAIL/);
  assert.match(sender, /noreply@gettanee\.com/);
  assert.doesNotMatch(delivery, /console\.(log|info|debug)/);
});

test("password reset delivery configuration is server-only and fails closed", () => {
  const email = source("lib/auth/password-reset-email.ts");
  const env = source(".env.example");

  assert.match(email, /process\.env\.RESEND_API_KEY/);
  assert.match(email, /resolveTaneeAuthEmailSender\(\)/);
  assert.doesNotMatch(email, /process\.env\.PASSWORD_RESET_FROM_EMAIL/);
  assert.match(email, /PasswordResetEmailError\("NOT_CONFIGURED"\)/);
  assert.match(email, /if\s*\(!response\.ok\)/);
  assert.match(email, /PasswordResetEmailError\("DELIVERY_FAILED"\)/);

  assert.match(env, /RESEND_API_KEY=""/);
  assert.doesNotMatch(env, /PASSWORD_RESET_FROM_EMAIL/);
  assert.doesNotMatch(env, /re_[A-Za-z0-9]{10,}/);
});

test("successful password reset returns to login with visible confirmation", () => {
  const action = source("app/reset-password/actions.ts");
  const login = source("app/login/page.tsx");
  const catalog = source("packages/i18n/src/locales/en/auth.ts");

  assert.match(action, /redirect\("\/login\?reset=success"\)/);
  assert.match(login, /includesValue\(params\.reset, "success"\)/);
  assert.match(
    catalog,
    /Your password has been updated\. Sign in with your new password\./,
  );
});
