import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("Super Admin custom business creation provisions its Owner as verified", () => {
  const action = source("app/businesses/actions.ts");
  const directCreation = action.slice(
    action.indexOf("export async function createBusinessAction"),
  );

  assert.match(directCreation, /await requireSuperAdmin\(\)/);
  assert.match(directCreation, /INSERT INTO "EmailVerificationState"/);
  assert.match(
    directCreation,
    /\$\{owner\.id\}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP/,
  );
  assert.doesNotMatch(directCreation, /createEmailVerificationToken\(\)/);
  assert.doesNotMatch(directCreation, /INSERT INTO "EmailVerificationToken"/);
  assert.doesNotMatch(directCreation, /sendEmailVerificationEmail/);
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
