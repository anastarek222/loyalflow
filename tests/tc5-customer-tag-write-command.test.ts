import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function action(sourceText: string, name: string, nextName: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  const end = sourceText.indexOf(`export async function ${nextName}`, start);
  assert.ok(start >= 0 && end > start);
  return sourceText.slice(start, end);
}

const facade = source(
  "app/businesses/[slug]/customers/[customerId]/actions.ts",
);
const tagActions = source(
  "app/businesses/[slug]/customers/[customerId]/tag-actions.ts",
);
const command = source("lib/server/business/customer-tag-write-command.ts");
const createAndAssignFacade = action(
  facade,
  "createAndAssignCustomerTagAction",
  "assignCustomerTagAction",
);
const assignFacade = action(
  facade,
  "assignCustomerTagAction",
  "removeCustomerTagAction",
);
const removeFacade = action(
  facade,
  "removeCustomerTagAction",
  "createCustomerNoteAction",
);

const createStart = command.indexOf(
  "export async function createAndAssignCustomerTagCommand",
);
const assignStart = command.indexOf(
  "export async function assignCustomerTagCommand",
);
const removeStart = command.indexOf(
  "export async function removeCustomerTagCommand",
);
assert.ok(createStart >= 0 && assignStart > createStart && removeStart > assignStart);
const createCommand = command.slice(createStart, assignStart);
const assignCommand = command.slice(assignStart, removeStart);
const removeCommand = command.slice(removeStart);

test("TC5 Customer tag compatibility facade routes all active paths to command-backed actions", () => {
  assert.match(createAndAssignFacade, /createAndAssignCustomerTagCommandAction/);
  assert.match(assignFacade, /assignCustomerTagCommandAction/);
  assert.match(removeFacade, /removeCustomerTagCommandAction/);
  for (const sourceText of [createAndAssignFacade, assignFacade, removeFacade]) {
    assert.doesNotMatch(sourceText, /prisma\.\$transaction|customerTagAssignment\.(createMany|deleteMany)/);
  }
  assert.match(tagActions, /canManageCustomerNotesTags/);
  assert.match(tagActions, /canPerformSubscriptionOperation/);
  assert.match(tagActions, /createAndAssignCustomerTagCommand/);
  assert.match(tagActions, /assignCustomerTagCommand/);
  assert.match(tagActions, /removeCustomerTagCommand/);
  assert.match(tagActions, /subscription-restricted/);
});

test("TC5 create-or-assign tag command preserves EXPAND versus OPERATE classification and no-op replay", () => {
  const customer = createCommand.indexOf("findTenantCustomer(");
  const existingTag = createCommand.indexOf("transaction.customerTag.findUnique");
  const existingAssignment = createCommand.indexOf(
    "transaction.customerTagAssignment.findUnique",
  );
  const intent = createCommand.indexOf(
    'const intent = existingTag ? "OPERATE" : "EXPAND"',
  );
  const guard = createCommand.indexOf("await canBusinessPerformSubscriptionOperation");
  const upsert = createCommand.indexOf("transaction.customerTag.upsert");
  const assign = createCommand.indexOf("transaction.customerTagAssignment.createMany");
  const audit = createCommand.indexOf("transaction.businessActivity.create");

  for (const position of [customer, existingTag, existingAssignment, intent, guard, upsert, assign, audit]) {
    assert.ok(position >= 0);
  }
  assert.ok(customer < existingTag);
  assert.ok(existingTag < existingAssignment);
  assert.ok(existingAssignment < intent);
  assert.ok(intent < guard);
  assert.ok(guard < upsert);
  assert.ok(guard < assign);
  assert.ok(assign < audit);
  assert.match(createCommand, /if \(existingAssignment\)/);
  assert.match(createCommand, /skipDuplicates: true/);
});

test("TC5 assign-existing tag command revalidates tenant topology and OPERATE before changed assignment", () => {
  const customer = assignCommand.indexOf("findTenantCustomer(");
  const tag = assignCommand.indexOf("transaction.customerTag.findFirst");
  const existing = assignCommand.indexOf("transaction.customerTagAssignment.findUnique");
  const guard = assignCommand.indexOf("await canBusinessPerformSubscriptionOperation");
  const assign = assignCommand.indexOf("transaction.customerTagAssignment.createMany");
  const audit = assignCommand.indexOf("transaction.businessActivity.create");

  for (const position of [customer, tag, existing, guard, assign, audit]) assert.ok(position >= 0);
  assert.ok(customer < tag);
  assert.ok(tag < existing);
  assert.ok(existing < guard);
  assert.ok(guard < assign);
  assert.ok(assign < audit);
  assert.match(assignCommand, /"OPERATE"/);
  assert.match(assignCommand, /"INVALID_TAG"/);
  assert.match(assignCommand, /skipDuplicates: true/);
});

test("TC5 remove tag command preserves missing-assignment no-op and guards changed removal", () => {
  const customer = removeCommand.indexOf("findTenantCustomer(");
  const assignment = removeCommand.indexOf("transaction.customerTagAssignment.findFirst");
  const noOp = removeCommand.indexOf("if (!assignment)");
  const guard = removeCommand.indexOf("await canBusinessPerformSubscriptionOperation");
  const remove = removeCommand.indexOf("transaction.customerTagAssignment.deleteMany");
  const audit = removeCommand.indexOf("transaction.businessActivity.create");

  for (const position of [customer, assignment, noOp, guard, remove, audit]) assert.ok(position >= 0);
  assert.ok(customer < assignment);
  assert.ok(assignment < noOp);
  assert.ok(noOp < guard);
  assert.ok(guard < remove);
  assert.ok(remove < audit);
  assert.match(removeCommand, /"OPERATE"/);
  assert.match(removeCommand, /CUSTOMER_TAG_REMOVED/);
});

test("TC5 Customer tag write command stays provider and environment neutral", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /businessId: input\.businessId/);
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
});
