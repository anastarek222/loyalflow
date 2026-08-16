import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

function createActionSource() {
  const actions = source("app/businesses/[slug]/users/actions.ts");
  return actions.slice(
    actions.indexOf("export async function createBusinessUserAction"),
    actions.indexOf("export async function updateBusinessUserExperienceAccessAction"),
  );
}

test("TC5 Team creation delegates authoritative persistence to the provisioning command", () => {
  const action = createActionSource();

  assert.match(action, /await provisionBusinessUserCommand\(\{/);
  assert.match(action, /actor: session\.user/);
  assert.match(action, /passwordHash/);
  assert.match(action, /experienceAccess: resolveExperienceAccess/);
  assert.doesNotMatch(action, /prisma\.\$transaction/);
  assert.doesNotMatch(action, /transaction\.user\.create/);
  assert.doesNotMatch(action, /EmailVerificationState/);
  assert.doesNotMatch(action, /businessActivity\.create/);
  assert.doesNotMatch(action, /createBusinessNotification/);
});

test("TC5 Team creation preserves existing presentation outcomes around the command", () => {
  const action = createActionSource();

  assert.match(action, /BUSINESS_NOT_FOUND/);
  assert.match(action, /PLAN_LIMIT/);
  assert.match(action, /OWNER_EXISTS/);
  assert.match(action, /EMAIL_EXISTS/);
  assert.match(action, /subscription-restricted/);
  assert.match(action, /plan-limit/);
  assert.match(action, /owner-exists/);
  assert.match(action, /\?error=\$\{error\}/);
  assert.match(action, /revalidateTeamPages\(slug\)/);
  assert.match(action, /\?created=1/);
});

test("TC5 Team compatibility layer keeps auth validation and password hashing outside the command", () => {
  const action = createActionSource();

  assert.match(action, /await getManagementContext\(slug\)/);
  assert.match(action, /userSchema\.safeParse/);
  assert.match(action, /!isBusinessOwner && !isSuperAdmin/);
  assert.match(action, /await hash\(/);
  assert.match(action, /getEffectivePlanLimits/);
  assert.match(action, /existingBusinessOwner/);
  assert.match(action, /existingUser/);
});
