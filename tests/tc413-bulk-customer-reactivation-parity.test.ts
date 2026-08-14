import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const bulkActions = source("app/businesses/[slug]/customers/actions.ts");
const bulkActionStart = bulkActions.indexOf(
  "export async function bulkCustomerAction",
);
const bulkActionEnd = bulkActions.indexOf(
  "export async function createCustomerAction",
  bulkActionStart,
);
assert.ok(bulkActionStart >= 0 && bulkActionEnd > bulkActionStart);
const bulkAction = bulkActions.slice(bulkActionStart, bulkActionEnd);
const customerPage = source("app/businesses/[slug]/customers/page.tsx");
const customerCopy = source("lib/customers/ui-copy.ts");

test("TC4.13 guards bulk customer reactivation as OPERATE", () => {
  assert.match(bulkActions, /subscriptionLifecycleState: true/);
  assert.match(
    bulkAction,
    /activate &&[\s\S]*canPerformSubscriptionOperation\(/,
  );
  assert.match(
    bulkAction,
    /activate &&[\s\S]*canBusinessPerformSubscriptionOperation\(/,
  );
  assert.match(bulkAction, /"OPERATE"/);
  assert.ok(
    bulkAction.indexOf("await canBusinessPerformSubscriptionOperation") <
      bulkAction.indexOf("transaction.customer.updateMany"),
  );
});

test("TC4.13 preserves bulk deactivation and no-op replay", () => {
  assert.match(bulkAction, /if \(changedIds\.length > 0\)/);
  assert.match(bulkAction, /activate &&/);
  assert.match(bulkAction, /CUSTOMER_DEACTIVATED/);
  assert.match(bulkAction, /data: \{ isActive: activate \}/);
  assert.ok(
    bulkAction.indexOf("if (changedIds.length > 0)") <
      bulkAction.indexOf("canPerformSubscriptionOperation"),
  );
});

test("TC4.13 exposes bilingual bounded feedback without provider behavior", () => {
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.match(customerPage, /copy\.subscriptionRestricted/);
  assert.match(customerCopy, /تظل إجراءات الإيقاف الأمنية متاحة/);
  assert.match(customerCopy, /Security deactivation controls remain available/);
  assert.doesNotMatch(bulkAction, /stripe|checkout|webhook|process\.env/i);
});
