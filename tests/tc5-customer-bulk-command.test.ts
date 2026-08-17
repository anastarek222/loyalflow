import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source("app/businesses/[slug]/customers/actions.ts");
const command = source("lib/server/business/customer-bulk-command.ts");
const bulkStart = actions.indexOf("export async function bulkCustomerAction");
const bulkEnd = actions.indexOf("export async function createCustomerAction", bulkStart);
assert.ok(bulkStart >= 0 && bulkEnd > bulkStart);
const bulkAction = actions.slice(bulkStart, bulkEnd);

test("TC5 Customer bulk action keeps presentation preflight and delegates persisted writes", () => {
  assert.match(bulkAction, /parseSelectedCustomerIds/);
  assert.match(bulkAction, /canUseCustomerBulkOperations|canManageCustomerNotesTags/);
  assert.match(bulkAction, /canPerformSubscriptionOperation/);
  assert.match(bulkAction, /setBulkCustomerStatusCommand/);
  assert.match(bulkAction, /mutateBulkCustomerTagCommand/);
  assert.match(bulkAction, /scheduleBusinessGoogleSheetsSync/);
  assert.doesNotMatch(bulkAction, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(bulkAction, /prisma\.\$transaction/);
  assert.doesNotMatch(bulkAction, /transaction\.customer\.updateMany/);
  assert.doesNotMatch(
    bulkAction,
    /transaction\.customerTagAssignment\.(createMany|deleteMany)/,
  );
  assert.doesNotMatch(bulkAction, /transaction\.businessActivity\.createMany/);
});

test("TC5 Customer bulk status command preserves tenant selection, reactivation guard, deactivation exit and atomic audit", () => {
  const statusStart = command.indexOf(
    "export async function setBulkCustomerStatusCommand",
  );
  const tagStart = command.indexOf(
    "export async function mutateBulkCustomerTagCommand",
  );
  assert.ok(statusStart >= 0 && tagStart > statusStart);
  const statusCommand = command.slice(statusStart, tagStart);

  const selection = statusCommand.indexOf("transaction.customer.findMany");
  const changed = statusCommand.indexOf("getBulkStateChangeIds(");
  const noOp = statusCommand.indexOf("changedIds.length === 0");
  const guard = statusCommand.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const update = statusCommand.indexOf("transaction.customer.updateMany");
  const audit = statusCommand.indexOf("transaction.businessActivity.createMany");

  for (const position of [selection, changed, noOp, guard, update, audit]) {
    assert.ok(position >= 0);
  }
  assert.ok(selection < changed);
  assert.ok(changed < noOp);
  assert.ok(noOp < guard);
  assert.ok(guard < update);
  assert.ok(update < audit);
  assert.match(statusCommand, /input\.activate &&[\s\S]*canBusinessPerformSubscriptionOperation/);
  assert.match(statusCommand, /"OPERATE"/);
  assert.match(statusCommand, /"CUSTOMER_REACTIVATED"/);
  assert.match(statusCommand, /"CUSTOMER_DEACTIVATED"/);
});

test("TC5 Customer bulk tag command revalidates tenant topology and keeps changed writes atomic", () => {
  const tagStart = command.indexOf(
    "export async function mutateBulkCustomerTagCommand",
  );
  assert.ok(tagStart >= 0);
  const tagCommand = command.slice(tagStart);

  const customers = tagCommand.indexOf("transaction.customer.findMany");
  const tag = tagCommand.indexOf("transaction.customerTag.findFirst");
  const assignments = tagCommand.indexOf(
    "transaction.customerTagAssignment.findMany",
  );
  const noOp = tagCommand.indexOf("changedIds.length === 0");
  const guard = tagCommand.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const add = tagCommand.indexOf("transaction.customerTagAssignment.createMany");
  const remove = tagCommand.indexOf("transaction.customerTagAssignment.deleteMany");
  const audit = tagCommand.indexOf("transaction.businessActivity.createMany");

  for (const position of [
    customers,
    tag,
    assignments,
    noOp,
    guard,
    add,
    remove,
    audit,
  ]) {
    assert.ok(position >= 0);
  }
  assert.ok(customers < tag);
  assert.ok(tag < assignments);
  assert.ok(assignments < noOp);
  assert.ok(noOp < guard);
  assert.ok(guard < add);
  assert.ok(guard < remove);
  assert.ok(add < audit);
  assert.ok(remove < audit);
  assert.match(tagCommand, /businessId: input\.businessId/);
  assert.match(tagCommand, /"OPERATE"/);
  assert.match(tagCommand, /"INVALID_SELECTION"/);
  assert.match(tagCommand, /"INVALID_TAG"/);
});

test("TC5 Customer bulk command has no provider or environment coupling", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
});
