import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("TC5 team provisioning command owns the authoritative atomic lifecycle", () => {
  const command = source("lib/server/business/team-provisioning-command.ts");

  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /canBusinessPerformSubscriptionOperation/);
  assert.match(command, /"EXPAND"/);
  assert.match(command, /transaction\.business\.findUnique/);
  assert.match(command, /transaction\.planConfiguration\.findUnique/);
  assert.match(command, /transaction\.user\.count/);
  assert.match(command, /isWithinPlanLimit/);
  assert.match(command, /transaction\.user\.findUnique/);
  assert.match(command, /transaction\.user\.findFirst/);
  assert.match(command, /transaction\.user\.create/);
  assert.match(command, /INSERT INTO "EmailVerificationState"/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.match(command, /createBusinessNotification/);
});

test("TC5 team provisioning command preserves trusted sign-in readiness and server audit authority", () => {
  const command = source("lib/server/business/team-provisioning-command.ts");

  assert.match(command, /CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP/);
  assert.match(command, /activityActorFields\(input\.actor, input\.businessId\)/);
  assert.match(command, /activityRequestMetadata\(activityContext\)/);
  assert.doesNotMatch(command, /EmailVerificationToken|sendEmailVerificationEmail/);
});

test("TC5 team provisioning command keeps presentation and password parsing outside", () => {
  const command = source("lib/server/business/team-provisioning-command.ts");

  assert.doesNotMatch(command, /next\/navigation|redirect\(/);
  assert.doesNotMatch(command, /next\/cache|revalidatePath/);
  assert.doesNotMatch(command, /FormData|safeParse/);
  assert.doesNotMatch(command, /bcrypt|hash\(/);
  assert.match(command, /passwordHash: string/);
});

test("TC5 team provisioning extraction does not replace the compatibility writer yet", () => {
  const actions = source("app/businesses/[slug]/users/actions.ts");

  assert.match(actions, /export async function createBusinessUserAction/);
  assert.match(actions, /await hash\(/);
  assert.match(actions, /prisma\.\$transaction/);
  assert.match(actions, /revalidateTeamPages\(slug\)/);
});
