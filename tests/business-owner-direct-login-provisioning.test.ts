import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const businessActions = readFileSync("app/businesses/actions.ts", "utf8");
const loginActions = readFileSync("app/login/actions.ts", "utf8");

const directCreation = businessActions.slice(
  businessActions.indexOf("export async function createBusinessAction"),
);

test("Super Admin business creation provisions an immediately sign-in-ready Owner", () => {
  assert.match(directCreation, /await requireSuperAdmin\(\)/);
  assert.match(directCreation, /role:\s*"OWNER"/);
  assert.match(directCreation, /businessId:\s*business\.id/);
  assert.match(directCreation, /isActive:\s*true/);

  assert.match(
    directCreation,
    /INSERT INTO "EmailVerificationState"[\s\S]*\$\{owner\.id\},\s*CURRENT_TIMESTAMP,\s*CURRENT_TIMESTAMP,\s*CURRENT_TIMESTAMP/,
  );
  assert.doesNotMatch(directCreation, /INSERT INTO "EmailVerificationToken"/);
  assert.doesNotMatch(directCreation, /sendEmailVerificationEmail/);
});

test("direct provisioning keeps the normal verification policy for other auth flows", () => {
  assert.match(loginActions, /isEmailVerificationSatisfied\(user\.id\)/);
  assert.match(businessActions, /createOwnerInvitationToken/);
  assert.match(businessActions, /sendOwnerInvitationEmail/);
});
