import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const teamActions = readFileSync("app/businesses/[slug]/users/actions.ts", "utf8");
const teamCommand = readFileSync("lib/server/business/team-provisioning-command.ts", "utf8");
const authSource = readFileSync("auth.ts", "utf8");

const createTeamUser = teamActions.slice(
  teamActions.indexOf("export async function createBusinessUserAction"),
  teamActions.indexOf("export async function updateBusinessUserExperienceAccessAction"),
);

test("trusted team provisioning creates immediately sign-in-ready accounts", () => {
  assert.match(createTeamUser, /await getManagementContext\(slug\)/);
  assert.match(createTeamUser, /!isBusinessOwner && !isSuperAdmin/);
  assert.match(createTeamUser, /passwordHash/);
  assert.match(createTeamUser, /provisionBusinessUserCommand/);
  assert.match(createTeamUser, /businessId:\s*business\.id/);

  assert.match(teamCommand, /transaction\.user\.create/);
  assert.match(teamCommand, /businessId: input\.businessId/);
  assert.match(teamCommand, /isActive:\s*true/);
  assert.match(
    teamCommand,
    /INSERT INTO "EmailVerificationState"[\s\S]*\$\{createdUser\.id\},\s*CURRENT_TIMESTAMP,\s*CURRENT_TIMESTAMP,\s*CURRENT_TIMESTAMP/,
  );
  assert.doesNotMatch(teamCommand, /EmailVerificationToken/);
  assert.doesNotMatch(teamCommand, /sendEmailVerificationEmail/);
});

test("credentials login still requires the canonical verification policy", () => {
  assert.match(authSource, /isEmailVerificationSatisfied\(user\.id\)/);
  assert.match(authSource, /!user \|\| !user\.isActive/);
});
