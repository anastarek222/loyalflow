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

test("verification email uses existing Resend configuration and a 24-hour link", () => {
  const email = source("lib/auth/email-verification-email.ts");

  assert.match(email, /process\.env\.RESEND_API_KEY/);
  assert.match(email, /process\.env\.PASSWORD_RESET_FROM_EMAIL/);
  assert.match(email, /\/verify-email\?token=/);
  assert.match(email, /expires in 24 hours/i);
  assert.doesNotMatch(email, /tokenHash/);
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

test("login surfaces verification success while resend recovery remains a dedicated public flow", () => {
  const login = source("app/login/page.tsx");
  const resendPage = source("app/verify-email/resend/page.tsx");
  const resendAction = source("app/verify-email/resend/actions.ts");

  assert.match(login, /verificationValue/);
  assert.match(login, /Your email has been verified/);
  assert.doesNotMatch(login, /href="\/verify-email\/resend"/);
  assert.match(resendPage, /resendEmailVerificationAction/);
  assert.match(resendAction, /email_verification_resend_failed/);
  assert.doesNotMatch(resendAction, /throw error/);
});
