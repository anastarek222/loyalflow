import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const facade = source(
  "app/businesses/[slug]/customers/[customerId]/actions.ts",
);
const tagActions = source(
  "app/businesses/[slug]/customers/[customerId]/tag-actions.ts",
);
const tagCommand = source("lib/server/business/customer-tag-write-command.ts");
const customerPage = source(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
);

test("TC4.14 classifies new tags as EXPAND and existing topology as OPERATE", () => {
  assert.match(facade, /createAndAssignCustomerTagCommandAction/);
  assert.match(tagActions, /const intent = existingTag \? "OPERATE" : "EXPAND"/);
  assert.match(tagCommand, /const intent = existingTag \? "OPERATE" : "EXPAND"/);
  assert.match(tagCommand, /"OPERATE"/);
  assert.match(tagCommand, /"EXPAND"/);
});

test("TC4.14 re-checks entitlement before every individual tag mutation", () => {
  assert.match(tagActions, /canPerformSubscriptionOperation\(/);
  assert.match(tagCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.equal(
    tagCommand.match(/canBusinessPerformSubscriptionOperation\(/g)?.length,
    3,
  );
  assert.match(tagCommand, /input\.businessId/);
});

test("TC4.14 preserves idempotent assignment and removal convergence", () => {
  assert.match(tagCommand, /if \(existingAssignment\)/);
  assert.match(tagCommand, /if \(existing\)/);
  assert.match(tagCommand, /if \(!assignment\)/);
  assert.match(tagCommand, /skipDuplicates: true/);
  assert.match(tagCommand, /customerTagAssignment\.deleteMany/);
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.doesNotMatch(`${tagActions}\n${tagCommand}`, /stripe|checkout|webhook|process\.env/i);
});
