import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("custom business owner is enrolled unverified and receives only plaintext email token", () => {
  const action = source("app/businesses/actions.ts");

  assert.match(action, /createEmailVerificationToken\(\)/);
  assert.match(action, /INSERT INTO "EmailVerificationState"/);
  assert.match(action, /\$\{owner\.id\}, NULL/);
  assert.match(action, /INSERT INTO "EmailVerificationToken"/);
  assert.match(action, /\$\{ownerEmailVerification\.tokenHash\}/);
  assert.match(action, /token: ownerEmailVerification\.token/);
  assert.doesNotMatch(action, /token: ownerEmailVerification\.tokenHash/);
});

test("credentials login blocks only accounts explicitly enrolled as unverified", () => {
  const auth = source("auth.ts");
  const access = source("lib/auth/email-verification-access.ts");

  assert.match(auth, /isEmailVerificationSatisfied\(user\.id\)/);
  assert.match(access, /FROM "EmailVerificationState"/);
  assert.match(access, /return !state \|\| state\.verifiedAt !== null/);
});

test("verification resend is enumeration resistant and rate limited", () => {
  const action = source("app/verify-email/resend/actions.ts");

  assert.match(action, /await headers\(\)/);
  assert.match(action, /email-verification-resend:/);
  assert.match(action, /limit: 5/);
  assert.match(action, /\/verify-email\/resend\?sent=1/);
  assert.match(action, /issueEmailVerificationToken/);
  assert.match(action, /sendEmailVerificationEmail/);
});
