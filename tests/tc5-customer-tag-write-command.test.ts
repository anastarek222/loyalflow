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

const actions = source(
  "app/businesses/[slug]/customers/[customerId]/actions.ts",
);
const command = source("lib/server/business/customer-tag-write-command.ts");
const createAndAssignAction = action(
  actions,
  "createAndAssignCustomerTagAction",
  "assignCustomerTagAction",
);
const assignAction = action(
  actions,
  "assignCustomerTagAction",
  "removeCustomerTagAction",
);
const removeAction = action(
  actions,
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

test("TC5 Customer tag extraction preserves active actions until wiring", () => {
  for (const sourceText of [createAndAssignAction, assignAction, removeAction]) {
    assert.match(sourceText, /canBusinessPerformSubscriptionOperation/);
    assert.match(sourceText, /prisma\.\$transaction/);
    assert.match(sourceText, /subscription-restricted/);
  }
  assert.match(createAndAssignAction, /existingTag \? "OPERATE" : "EXPAND"/);
  assert.match(createAndAssignAction, /skipDuplicates: true/);
  assert.match(assignAction, /skipDuplicates: true/);
  assert.match(removeAction, /if \(assignment\)/);
  assert.doesNotMatch(
    actions,
    /createAndAssignCustomerTagCommand|assignCustomerTagCommand|removeCustomerTagCommand/,
  );
});

test("TC5 create-or-assign tag command preserves EXPAND versus OPERATE classification and no-op replay", () => {
  const customer = createCommand.indexOf("findTenantCustomer(");
  const existingTag = createCommand.indexOf("transaction.customerTag.findUnique");
  const existingAssignment = createCommand.indexOf(
    "transaction.customerTagAssignment.findUnique",
  );
  const noOp = createCommand.indexOf("existingAssignment");
  const intent = createCommand.indexOf(
    'const intent = existingTag ? "OPERATE" : "EXPAND"',
  );
  const guard = createCommand.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const upsert = createCommand.indexOf("transaction.customerTag.upsert");
  const assign = createCommand.indexOf(
    "transaction.customerTagAssignment.createMany",
  );
  const audit = createCommand.indexOf("transaction.businessActivity.create");

  for (const position of [
    customer,
    existingTag,
    existingAssignment,
    noOp,
    intent,
    guard,
    upsert,
    assign,
    audit,
  ]) assert.ok(position >= 0);
  assert.ok(customer < existingTag);
  assert.ok(existingTag < existingAssignment);
  assert.ok(existingAssignment < intent);
  assert.ok(intent < guard);
  assert.ok(guard < upsert);
  assert.ok(guard < assign);
  assert.ok(assign < audit);
  assert.match(createCommand, /skipDuplicates: true/);
});

test("TC5 assign-existing tag command revalidates tenant topology and OPERATE before changed assignment", () => {
  const customer = assignCommand.indexOf("findTenantCustomer(");
  const tag = assignCommand.indexOf("transaction.customerTag.findFirst");
  const existing = assignCommand.indexOf(
    "transaction.customerTagAssignment.findUnique",
  );
  const guard = assignCommand.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const assign = assignCommand.indexOf(
    "transaction.customerTagAssignment.createMany",
  );
  const audit = assignCommand.indexOf("transaction.businessActivity.create");

  for (const position of [customer, tag, existing, guard, assign, audit]) {
    assert.ok(position >= 0);
  }
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
  const assignment = removeCommand.indexOf(
    "transaction.customerTagAssignment.findFirst",
  );
  const noOp = removeCommand.indexOf("if (!assignment)");
  const guard = removeCommand.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const remove = removeCommand.indexOf(
    "transaction.customerTagAssignment.deleteMany",
  );
  const audit = removeCommand.indexOf("transaction.businessActivity.create");

  for (const position of [customer, assignment, noOp, guard, remove, audit]) {
    assert.ok(position >= 0);
  }
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
