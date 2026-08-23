import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const actions = source("app/businesses/[slug]/branches/actions.ts");
const command = source("lib/server/business/branch-maintenance-command.ts");

function action(name: string, nextName?: string) {
  const start = actions.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = nextName
    ? actions.indexOf(`export async function ${nextName}`, start)
    : actions.length;
  assert.ok(end > start, `${name} must have a bounded source slice`);
  return actions.slice(start, end);
}

test("TC5 Branch maintenance commands own atomic OPERATE persistence", () => {
  assert.match(command, /export async function updateBranchCommand/);
  assert.match(command, /export async function setBranchStatusCommand/);
  assert.match(command, /prisma\.\$transaction/g);
  assert.match(command, /canBusinessPerformSubscriptionOperation/);
  assert.match(command, /"OPERATE"/);
  assert.match(command, /getTenantScopedBranchWhere/);
  assert.match(command, /transaction\.branch\.findFirst/);
  assert.match(command, /transaction\.branch\.update/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.match(command, /operation: "UPDATE"/);
  assert.match(command, /"ACTIVATE" : "DEACTIVATE"/);
});

test("TC5 Branch maintenance actions delegate while preserving presentation boundaries", () => {
  const update = action("updateBranchAction", "setBranchStatusAction");
  const status = action("setBranchStatusAction", "assignStaffToBranchAction");

  assert.match(update, /parseBranchForm/);
  assert.match(update, /updateBranchCommand/);
  assert.match(update, /isDuplicateBranchAssignmentError/);
  assert.match(update, /subscription-restricted/);
  assert.match(update, /not-found/);
  assert.doesNotMatch(update, /prisma\.\$transaction/);
  assert.doesNotMatch(update, /transaction\.branch\.update/);

  assert.match(status, /actionBooleanSchema\.safeParse/);
  assert.match(status, /setBranchStatusCommand/);
  assert.match(status, /subscription-restricted/);
  assert.match(status, /not-found/);
  assert.match(status, /activated/);
  assert.match(status, /deactivated/);
  assert.doesNotMatch(status, /prisma\.\$transaction/);
  assert.doesNotMatch(status, /transaction\.branch\.update/);
});

test("TC5 Branch maintenance command stays transport and provider neutral", () => {
  assert.doesNotMatch(command, /FormData|safeParse|redirect\(|revalidatePath/);
  assert.doesNotMatch(command, /stripe|checkout|webhook|fetch\(|process\.env/i);
});
