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
const command = source(
  "lib/server/business/customer-record-maintenance-command.ts",
);

const updateAction = action(
  actions,
  "updateCustomerAction",
  "setCustomerStatusAction",
);
const statusAction = action(
  actions,
  "setCustomerStatusAction",
  "adjustCustomerBalanceAction",
);

const updateCommandStart = command.indexOf(
  "export async function updateCustomerRecordCommand",
);
const statusCommandStart = command.indexOf(
  "export async function setCustomerRecordStatusCommand",
);
assert.ok(updateCommandStart >= 0 && statusCommandStart > updateCommandStart);
const updateCommand = command.slice(updateCommandStart, statusCommandStart);
const statusCommand = command.slice(statusCommandStart);

test("TC5 Customer record actions keep presentation checks and delegate persisted writes", () => {
  assert.match(updateAction, /customerSchema\.safeParse/);
  assert.match(updateAction, /canPerformSubscriptionOperation/);
  assert.match(updateAction, /duplicateCustomer/);
  assert.match(updateAction, /updateCustomerRecordCommand/);
  assert.match(updateAction, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(updateAction, /prisma\.\$transaction/);
  assert.doesNotMatch(updateAction, /transaction\.customer\.update/);

  assert.match(statusAction, /actionBooleanSchema\.safeParse/);
  assert.match(statusAction, /parsedStatus\.data &&[\s\S]*canPerformSubscriptionOperation/);
  assert.match(statusAction, /setCustomerRecordStatusCommand/);
  assert.match(statusAction, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(statusAction, /prisma\.\$transaction/);
  assert.doesNotMatch(statusAction, /transaction\.customer\.update/);
});

test("TC5 Customer profile command rechecks lifecycle, tenant ownership and duplicate phone before atomic write", () => {
  const guard = updateCommand.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const target = updateCommand.indexOf("transaction.customer.findFirst");
  const duplicate = updateCommand.indexOf(
    "const duplicateCustomer = await transaction.customer.findFirst",
  );
  const update = updateCommand.indexOf("transaction.customer.update");
  const audit = updateCommand.indexOf("transaction.businessActivity.create");

  for (const position of [guard, target, duplicate, update, audit]) {
    assert.ok(position >= 0);
  }
  assert.ok(guard < target);
  assert.ok(target < duplicate);
  assert.ok(duplicate < update);
  assert.ok(update < audit);
  assert.match(updateCommand, /businessId: input\.businessId/);
  assert.match(updateCommand, /"OPERATE"/);
  assert.match(updateCommand, /"DUPLICATE"/);
  assert.match(updateCommand, /"TARGET_NOT_FOUND"/);
  assert.match(updateCommand, /type: "CUSTOMER_UPDATED"/);
});

test("TC5 Customer status command guards reactivation but preserves deactivation security exit", () => {
  const target = statusCommand.indexOf("transaction.customer.findFirst");
  const guard = statusCommand.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const update = statusCommand.indexOf("transaction.customer.update");
  const audit = statusCommand.indexOf("transaction.businessActivity.create");

  for (const position of [target, guard, update, audit]) {
    assert.ok(position >= 0);
  }
  assert.ok(target < guard);
  assert.ok(guard < update);
  assert.ok(update < audit);
  assert.match(
    statusCommand,
    /input\.isActive &&[\s\S]*canBusinessPerformSubscriptionOperation/,
  );
  assert.match(statusCommand, /"OPERATE"/);
  assert.match(statusCommand, /"CUSTOMER_REACTIVATED"/);
  assert.match(statusCommand, /"CUSTOMER_DEACTIVATED"/);
  assert.match(statusCommand, /businessId: input\.businessId/);
});

test("TC5 Customer record maintenance command has no provider or environment coupling", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
});
