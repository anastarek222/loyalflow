import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync(
  new URL("../app/businesses/[slug]/customers/[customerId]/actions-legacy.ts", import.meta.url),
  "utf8",
);

function action(name: string, nextName: string) {
  const start = actions.indexOf(`export async function ${name}`);
  const end = actions.indexOf(`export async function ${nextName}`, start);
  assert.ok(start >= 0 && end > start);
  return actions.slice(start, end);
}

const createAndAssign = action("createAndAssignCustomerTagAction", "assignCustomerTagAction");
const assign = action("assignCustomerTagAction", "removeCustomerTagAction");
const remove = action("removeCustomerTagAction", "createCustomerNoteAction");

test("TC4.14 classifies new tags as EXPAND and existing topology as OPERATE", () => {
  assert.match(createAndAssign, /existingTag \? "OPERATE" : "EXPAND"/);
  assert.match(assign, /"OPERATE"/);
  assert.match(remove, /"OPERATE"/);
});

test("TC4.14 re-checks entitlement before every individual tag mutation", () => {
  for (const [sourceText, mutation] of [
    [createAndAssign, "transaction.customerTag.upsert"],
    [assign, "transaction.customerTagAssignment.createMany"],
    [remove, "transaction.customerTagAssignment.deleteMany"],
  ] as const) {
    assert.match(sourceText, /canPerformSubscriptionOperation\(/);
    assert.match(sourceText, /canBusinessPerformSubscriptionOperation\(/);
    assert.match(sourceText, /subscription-restricted/);
    assert.ok(sourceText.indexOf("await canBusinessPerformSubscriptionOperation") < sourceText.indexOf(mutation));
  }
});

test("TC4.14 preserves idempotent assignment and removal convergence", () => {
  assert.match(createAndAssign, /skipDuplicates: true/);
  assert.match(assign, /skipDuplicates: true/);
  assert.match(remove, /if \(assignment\)/);
  assert.match(remove, /if \(removed\.count > 0\)/);
  assert.doesNotMatch(actions, /stripe|checkout|webhook|process\.env/i);
});
