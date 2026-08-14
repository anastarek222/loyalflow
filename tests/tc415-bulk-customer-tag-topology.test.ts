import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync(
  new URL("../app/businesses/[slug]/customers/actions.ts", import.meta.url),
  "utf8",
);
const start = actions.indexOf("export async function bulkCustomerAction");
const end = actions.indexOf("export async function createCustomerAction", start);
assert.ok(start >= 0 && end > start);
const bulkAction = actions.slice(start, end);
const page = readFileSync(
  new URL("../app/businesses/[slug]/customers/page.tsx", import.meta.url),
  "utf8",
);
const copy = readFileSync(
  new URL("../lib/customers/ui-copy.ts", import.meta.url),
  "utf8",
);

test("TC4.15 guards changed bulk tag topology as OPERATE", () => {
  assert.match(actions, /subscriptionLifecycleState: true/);
  assert.match(bulkAction, /canPerformSubscriptionOperation\(/);
  assert.match(bulkAction, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(bulkAction, /"OPERATE"/);
  assert.ok(
    bulkAction.lastIndexOf("await canBusinessPerformSubscriptionOperation") <
      bulkAction.indexOf("transaction.customerTagAssignment.createMany"),
  );
});

test("TC4.15 preserves no-op replay and all-or-nothing tag writes", () => {
  assert.match(bulkAction, /if \(changedIds\.length > 0\)/);
  assert.match(bulkAction, /added\.count !== changedIds\.length/);
  assert.match(bulkAction, /removed\.count !== changedIds\.length/);
  assert.match(bulkAction, /businessActivity\.createMany/);
});

test("TC4.15 exposes bilingual feedback without provider behavior", () => {
  assert.match(page, /query\.error === "subscription-restricted"/);
  assert.match(copy, /تظل إجراءات الإيقاف الأمنية متاحة/);
  assert.match(copy, /Security deactivation controls remain available/);
  assert.doesNotMatch(bulkAction, /stripe|checkout|webhook|process\.env/i);
});
