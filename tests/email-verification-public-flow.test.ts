import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("public verification normalizes invalid, expired, and replayed tokens", () => {
  const action = source("app/verify-email/actions.ts");

  assert.match(action, /verifyEmail\(\{ token: parsed\.data\.token \}\)/);
  assert.match(action, /result\.status !== "success"/);
  assert.match(action, /\/verify-email\?error=invalid-token/);
  assert.match(action, /\/login\?verification=success/);
});

test("verification email uses Resend, the verified Tanee sender, and a 24-hour link", () => {
  const email = source("lib/auth/email-verification-email.ts");
  const sender = source("lib/auth/auth-email-sender.ts");

  assert.match(email, /process\.env\.RESEND_API_KEY/);
  assert.match(email, /resolveTaneeAuthEmailSender/);
  assert.doesNotMatch(email, /PASSWORD_RESET_FROM_EMAIL/);
  assert.match(sender, /noreply@gettanee\.com/);
  assert.match(email, /\/verify-email\?token=/);
  assert.match(email, /expires in 24 hours/i);
  assert.doesNotMatch(email, /tokenHash/);
});

test("verification delivery configuration is server-only and fails closed", () => {
  const email = source("lib/auth/email-verification-email.ts");
  const env = source(".env.example");

  assert.match(email, /EmailVerificationEmailError\("NOT_CONFIGURED"\)/);
  assert.match(email, /if\s*\(!response\.ok\)/);
  assert.match(email, /EmailVerificationEmailError\("DELIVERY_FAILED"\)/);
  assert.match(env, /RESEND_API_KEY=""/);
  assert.doesNotMatch(env, /PASSWORD_RESET_FROM_EMAIL/);
  assert.doesNotMatch(env, /re_[A-Za-z0-9]{10,}/);
});

test("verification resend keeps delivery failures private and enumeration-safe", () => {
  const resend = source("app/verify-email/resend/actions.ts");

  assert.match(resend, /try\s*\{/);
  assert.match(resend, /issueEmailVerificationToken/);
  assert.match(resend, /sendEmailVerificationEmail/);
  assert.match(resend, /catch\s*\(error\)/);
  assert.match(resend, /logServerError\("email_verification_resend_failed"/);
  assert.match(resend, /redirect\("\/verify-email\/resend\?sent=1"\)/);
  assert.doesNotMatch(resend, /user-not-found|not-configured|delivery-failed/i);
});

test("verification runtime consumes token and marks state in one transaction", () => {
  const runtime = source("lib/auth/email-verification-runtime.ts");

  assert.match(runtime, /prisma\.\$transaction/);
  assert.match(runtime, /UPDATE "EmailVerificationToken"/);
  assert.match(runtime, /"usedAt" IS NULL/);
  assert.match(runtime, /"expiresAt" > /);
  assert.match(runtime, /INSERT INTO "EmailVerificationState"/);
  assert.match(runtime, /"verifiedAt"/);
});

test("owner invitation redemption records mailbox possession as verified", () => {
  const runtime = source("lib/auth/owner-invitation-runtime.ts");

  assert.match(runtime, /INSERT INTO "EmailVerificationState"/);
  assert.match(runtime, /\$\{owner\.id\}/);
  assert.match(runtime, /\$\{atomicInput\.now\}/);
});

test("login surfaces verification success and a generic resend recovery path", () => {
  const login = source("app/login/page.tsx");
  const form = source("app/login/login-form.tsx");
  const catalog = source("packages/i18n/src/locales/en/auth.ts");
  const resend = source("app/verify-email/resend/actions.ts");

  assert.match(login, /includesValue\(params\.verification, "success"\)/);
  assert.match(catalog, /Your email has been verified/);
  assert.match(form, /href="\/verify-email\/resend"/);
  assert.match(resend, /email_verification_resend_failed/);
  assert.doesNotMatch(resend, /throw error/);
});
