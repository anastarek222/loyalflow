import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const actions = source("app/businesses/[slug]/branches/actions.ts");
const command = source("lib/server/business/branch-staff-assignment-command.ts");

function action(name: string, nextName?: string) {
  const start = actions.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = nextName
    ? actions.indexOf(`export async function ${nextName}`, start)
    : actions.length;
  assert.ok(end > start, `${name} must have a bounded source slice`);
  return actions.slice(start, end);
}

test("TC5 Branch staff commands own eligibility, tenant scope and atomic audit writes", () => {
  assert.match(command, /export async function assignStaffToBranchCommand/);
  assert.match(command, /export async function removeStaffAssignmentCommand/);
  assert.match(command, /canBusinessPerformSubscriptionOperation/);
  assert.match(command, /"OPERATE"/);
  assert.match(command, /transaction\.branch\.findFirst/);
  assert.match(command, /transaction\.user\.findUnique/);
  assert.match(command, /getBranchAssignmentEligibility/);
  assert.match(command, /getTenantScopedAssignmentWhere/);
  assert.match(command, /transaction\.branchStaffAssignment\.create/);
  assert.match(command, /transaction\.branchStaffAssignment\.delete/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.match(command, /"ASSIGN_STAFF"/);
  assert.match(command, /"REMOVE_STAFF"/);
});

test("TC5 Branch staff actions delegate while preserving bounded presentation outcomes", () => {
  const assign = action("assignStaffToBranchAction", "removeStaffAssignmentAction");
  const remove = action("removeStaffAssignmentAction");

  assert.match(assign, /opaqueIdSchema\.safeParse/);
  assert.match(assign, /assignStaffToBranchCommand/);
  assert.match(assign, /subscription-restricted/);
  assert.match(assign, /ineligible-user/);
  assert.match(assign, /duplicate-assignment/);
  assert.doesNotMatch(assign, /prisma\.\$transaction/);
  assert.doesNotMatch(assign, /branchStaffAssignment\.create/);

  assert.match(remove, /opaqueIdSchema\.safeParse/);
  assert.match(remove, /removeStaffAssignmentCommand/);
  assert.match(remove, /subscription-restricted/);
  assert.match(remove, /not-found/);
  assert.doesNotMatch(remove, /prisma\.\$transaction/);
  assert.doesNotMatch(remove, /branchStaffAssignment\.delete/);
});

test("TC5 Branch staff command stays transport and provider neutral", () => {
  assert.doesNotMatch(command, /FormData|safeParse|redirect\(|revalidatePath/);
  assert.doesNotMatch(command, /stripe|checkout|webhook|fetch\(|process\.env/i);
});
