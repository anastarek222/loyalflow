import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("TC5 Branch creation command owns persisted expansion and atomic creation", () => {
  const command = source("lib/server/business/branch-creation-command.ts");

  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /canBusinessPerformSubscriptionOperation/);
  assert.match(command, /"EXPAND"/);
  assert.match(command, /transaction\.business\.findUnique/);
  assert.match(command, /transaction\.planConfiguration\.findUnique/);
  assert.match(command, /transaction\.branch\.count/);
  assert.match(command, /isWithinPlanLimit/);
  assert.match(command, /"BRANCHES"/);
  assert.match(command, /transaction\.branch\.create/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.match(command, /buildBranchAuditActivity/);
});

test("TC5 Branch command keeps presentation and input parsing outside", () => {
  const command = source("lib/server/business/branch-creation-command.ts");

  assert.doesNotMatch(command, /next\/navigation|redirect\(/);
  assert.doesNotMatch(command, /next\/cache|revalidatePath/);
  assert.doesNotMatch(command, /FormData|safeParse/);
  assert.doesNotMatch(command, /isDuplicateBranchAssignmentError/);
});

test("TC5 Branch creation delegates authoritative persistence to the command", () => {
  const actions = source("app/businesses/[slug]/branches/actions.ts");
  const createAction = actions.slice(
    actions.indexOf("export async function createBranchAction"),
    actions.indexOf("export async function updateBranchAction"),
  );

  assert.match(createAction, /parseBranchForm/);
  assert.match(createAction, /createBranchCommand/);
  assert.doesNotMatch(createAction, /prisma\.\$transaction/);
  assert.doesNotMatch(createAction, /transaction\.branch\.create/);
  assert.match(createAction, /PLAN_LIMIT/);
  assert.match(createAction, /SUBSCRIPTION_RESTRICTED/);
  assert.match(createAction, /BUSINESS_NOT_FOUND/);
  assert.match(createAction, /isDuplicateBranchAssignmentError/);
  assert.match(createAction, /revalidateBranchPaths/);
});
