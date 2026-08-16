import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const bulkActions = source("app/businesses/[slug]/customers/actions.ts");
const bulkCommand = source("lib/server/business/customer-bulk-command.ts");
const bulkActionStart = bulkActions.indexOf(
  "export async function bulkCustomerAction",
);
const bulkActionEnd = bulkActions.indexOf(
  "export async function createCustomerAction",
  bulkActionStart,
);
assert.ok(bulkActionStart >= 0 && bulkActionEnd > bulkActionStart);
const bulkAction = bulkActions.slice(bulkActionStart, bulkActionEnd);
const statusCommandStart = bulkCommand.indexOf(
  "export async function setBulkCustomerStatusCommand",
);
const tagCommandStart = bulkCommand.indexOf(
  "export async function mutateBulkCustomerTagCommand",
  statusCommandStart,
);
assert.ok(statusCommandStart >= 0 && tagCommandStart > statusCommandStart);
const statusCommand = bulkCommand.slice(statusCommandStart, tagCommandStart);
const customerPage = source("app/businesses/[slug]/customers/page.tsx");
const customerCopy = source("lib/customers/ui-copy.ts");

test("TC4.13 guards bulk customer reactivation as OPERATE", () => {
  assert.match(bulkActions, /subscriptionLifecycleState: true/);
  assert.match(
    bulkAction,
    /activate &&[\s\S]*canPerformSubscriptionOperation\(/,
  );
  assert.match(
    statusCommand,
    /input\.activate &&[\s\S]*canBusinessPerformSubscriptionOperation\(/,
  );
  assert.match(statusCommand, /"OPERATE"/);
  assert.ok(
    statusCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      statusCommand.indexOf("transaction.customer.updateMany"),
  );
});

test("TC4.13 preserves bulk deactivation and no-op replay", () => {
  assert.match(statusCommand, /if \(changedIds\.length === 0\)/);
  assert.match(statusCommand, /input\.activate &&/);
  assert.match(statusCommand, /CUSTOMER_DEACTIVATED/);
  assert.match(statusCommand, /data: \{ isActive: input\.activate \}/);
  assert.ok(
    statusCommand.indexOf("changedIds.length === 0") <
      statusCommand.indexOf("canBusinessPerformSubscriptionOperation"),
  );
});

test("TC4.13 exposes bilingual bounded feedback without provider behavior", () => {
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.match(customerPage, /copy\.subscriptionRestricted/);
  assert.match(customerCopy, /تظل إجراءات الإيقاف الأمنية متاحة/);
  assert.match(customerCopy, /Security deactivation controls remain available/);
  assert.doesNotMatch(
    `${bulkAction}\n${statusCommand}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
