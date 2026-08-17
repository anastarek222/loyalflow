import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source(
  "app/businesses/[slug]/customers/[customerId]/tag-actions.ts",
);
const command = source("lib/server/business/customer-tag-write-command.ts");

test("TC5 bounded tag actions re-establish server authority and own no transaction", () => {
  assert.match(actions, /await auth\(\)/);
  assert.match(actions, /opaqueIdSchema\.safeParse/);
  assert.match(actions, /canManageCustomerNotesTags/);
  assert.match(actions, /prisma\.business\.findUnique/);
  assert.match(actions, /prisma\.customer\.findFirst/);
  assert.doesNotMatch(actions, /prisma\.\$transaction/);
  assert.doesNotMatch(actions, /transaction\.customerTag/);
});

test("TC5 create-or-assign bounded action preserves no-op replay and EXPAND versus OPERATE preflight", () => {
  const existingTag = actions.indexOf("prisma.customerTag.findUnique");
  const existingAssignment = actions.indexOf(
    "prisma.customerTagAssignment.findUnique",
  );
  const intent = actions.indexOf('existingTag ? "OPERATE" : "EXPAND"');
  const commandCall = actions.indexOf("createAndAssignCustomerTagCommand({");
  assert.ok(existingTag >= 0 && existingAssignment > existingTag);
  assert.ok(intent > existingAssignment && commandCall > intent);
  assert.match(actions, /if \(!existingAssignment\)/);
});

test("TC5 assign and remove bounded actions preserve no-op-aware OPERATE preflight", () => {
  assert.match(actions, /assignCustomerTagCommand\(/);
  assert.match(actions, /removeCustomerTagCommand\(/);
  assert.match(actions, /!existing &&/);
  assert.match(actions, /assignment &&/);
  assert.match(actions, /"OPERATE"/);
  assert.match(actions, /success=tag-assigned/);
  assert.match(actions, /success=tag-removed/);
});

test("TC5 tag command remains the sole atomic persisted authority", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /canBusinessPerformSubscriptionOperation/);
  assert.match(command, /transaction\.customerTag\.upsert/);
  assert.match(command, /transaction\.customerTagAssignment\.createMany/);
  assert.match(command, /transaction\.customerTagAssignment\.deleteMany/);
  assert.match(command, /transaction\.businessActivity\.create/);
});
