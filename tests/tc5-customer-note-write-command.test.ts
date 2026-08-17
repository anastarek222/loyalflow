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
  "app/businesses/[slug]/customers/[customerId]/actions-legacy.ts",
);
const command = source("lib/server/business/customer-note-write-command.ts");
const createAction = action(
  actions,
  "createCustomerNoteAction",
  "updateCustomerNoteAction",
);
const updateAction = action(
  actions,
  "updateCustomerNoteAction",
  "addLoyaltyAction",
);
const createCommandStart = command.indexOf(
  "export async function createCustomerNoteCommand",
);
const updateCommandStart = command.indexOf(
  "export async function updateCustomerNoteCommand",
);
assert.ok(createCommandStart >= 0 && updateCommandStart > createCommandStart);
const createCommand = command.slice(createCommandStart, updateCommandStart);
const updateCommand = command.slice(updateCommandStart);

test("TC5 Customer note compatibility implementation preserves the active action contract", () => {
  for (const sourceText of [createAction, updateAction]) {
    assert.match(sourceText, /customerNoteContentSchema\.safeParse/);
    assert.match(sourceText, /canPerformSubscriptionOperation/);
    assert.match(sourceText, /canBusinessPerformSubscriptionOperation/);
    assert.match(sourceText, /subscription-restricted/);
    assert.match(sourceText, /prisma\.\$transaction/);
  }
  assert.match(createAction, /transaction\.customerNote\.create/);
  assert.match(updateAction, /opaqueIdSchema\.safeParse/);
  assert.match(updateAction, /transaction\.customerNote\.update/);
});

test("TC5 Customer note creation command rechecks lifecycle and tenant ownership before atomic note and audit", () => {
  const guard = createCommand.indexOf("await canBusinessPerformSubscriptionOperation");
  const customer = createCommand.indexOf("transaction.customer.findFirst");
  const create = createCommand.indexOf("transaction.customerNote.create");
  const audit = createCommand.indexOf("transaction.businessActivity.create");
  for (const position of [guard, customer, create, audit]) assert.ok(position >= 0);
  assert.ok(guard < customer);
  assert.ok(customer < create);
  assert.ok(create < audit);
  assert.match(createCommand, /businessId: input\.businessId/);
  assert.match(createCommand, /"OPERATE"/);
  assert.match(createCommand, /"TARGET_NOT_FOUND"/);
  assert.match(createCommand, /type: "CUSTOMER_NOTE_CREATED"/);
});

test("TC5 Customer note update command rechecks Customer and note tenant ownership before atomic update and audit", () => {
  const guard = updateCommand.indexOf("await canBusinessPerformSubscriptionOperation");
  const customer = updateCommand.indexOf("transaction.customer.findFirst");
  const note = updateCommand.indexOf("transaction.customerNote.findFirst");
  const update = updateCommand.indexOf("transaction.customerNote.update");
  const audit = updateCommand.indexOf("transaction.businessActivity.create");
  for (const position of [guard, customer, note, update, audit]) assert.ok(position >= 0);
  assert.ok(guard < customer);
  assert.ok(customer < note);
  assert.ok(note < update);
  assert.ok(update < audit);
  assert.match(updateCommand, /businessId: input\.businessId/);
  assert.match(updateCommand, /customerId: customer\.id/);
  assert.match(updateCommand, /"OPERATE"/);
  assert.match(updateCommand, /"TARGET_NOT_FOUND"/);
  assert.match(updateCommand, /type: "CUSTOMER_NOTE_UPDATED"/);
});

test("TC5 Customer note write command has no provider or environment coupling", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
});
