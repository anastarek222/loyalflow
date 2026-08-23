import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync(
  new URL("../app/businesses/[slug]/customers/actions.ts", import.meta.url),
  "utf8",
);
const command = readFileSync(
  new URL("../lib/server/business/customer-bulk-command.ts", import.meta.url),
  "utf8",
);
const start = actions.indexOf("export async function bulkCustomerAction");
const end = actions.indexOf("export async function createCustomerAction", start);
assert.ok(start >= 0 && end > start);
const bulkAction = actions.slice(start, end);
const tagStart = command.indexOf(
  "export async function mutateBulkCustomerTagCommand",
);
assert.ok(tagStart >= 0);
const tagCommand = command.slice(tagStart);
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
  assert.match(tagCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(tagCommand, /"OPERATE"/);
  assert.ok(
    tagCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      tagCommand.indexOf("transaction.customerTagAssignment.createMany"),
  );
});

test("TC4.15 preserves no-op replay and all-or-nothing tag writes", () => {
  assert.match(tagCommand, /if \(changedIds\.length === 0\)/);
  assert.match(tagCommand, /added\.count !== changedIds\.length/);
  assert.match(tagCommand, /removed\.count !== changedIds\.length/);
  assert.match(tagCommand, /businessActivity\.createMany/);
  assert.ok(
    tagCommand.indexOf("changedIds.length === 0") <
      tagCommand.indexOf("canBusinessPerformSubscriptionOperation"),
  );
});

test("TC4.15 exposes bilingual feedback without provider behavior", () => {
  assert.match(page, /query\.error === "subscription-restricted"/);
  assert.match(copy, /تظل إجراءات الإيقاف الأمنية متاحة/);
  assert.match(copy, /Security deactivation controls remain available/);
  assert.doesNotMatch(
    `${bulkAction}\n${tagCommand}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
