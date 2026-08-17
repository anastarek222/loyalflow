import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function action(sourceText: string, name: string, nextName?: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = nextName
    ? sourceText.indexOf(`export async function ${nextName}`, start)
    : sourceText.length;
  assert.ok(end > start, `${name} must have a bounded source slice`);
  return sourceText.slice(start, end);
}

const customerActions = source(
  "app/businesses/[slug]/customers/[customerId]/actions-legacy.ts",
);
const customerPage = source(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
);

test("TC4.10 guards customer profile and note maintenance as OPERATE", () => {
  const guardedActions = [
    [
      action(customerActions, "updateCustomerAction", "setCustomerStatusAction"),
      "transaction.customer.update",
    ],
    [
      action(customerActions, "createCustomerNoteAction", "updateCustomerNoteAction"),
      "transaction.customerNote.create",
    ],
    [
      action(customerActions, "updateCustomerNoteAction", "addLoyaltyAction"),
      "transaction.customerNote.update",
    ],
  ] as const;

  for (const [sourceText, mutation] of guardedActions) {
    assert.match(sourceText, /canPerformSubscriptionOperation\(/);
    assert.match(sourceText, /canBusinessPerformSubscriptionOperation\(/);
    assert.match(sourceText, /"OPERATE"/);
    assert.match(sourceText, /subscription-restricted/);
    assert.ok(
      sourceText.indexOf("await canBusinessPerformSubscriptionOperation") <
        sourceText.indexOf(mutation),
    );
  }
});

test("TC4.10 preserves customer deactivation safety", () => {
  const statusAction = action(
    customerActions,
    "setCustomerStatusAction",
    "adjustCustomerBalanceAction",
  );
  assert.match(
    statusAction,
    /parsedStatus\.data &&[\s\S]*canPerformSubscriptionOperation/,
  );
  assert.match(statusAction, /isActive: parsedStatus\.data/);

});

test("TC4.10 exposes bounded feedback without provider or schema behavior", () => {
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.match(customerPage, /security controls remain accessible/);
  assert.doesNotMatch(customerActions, /stripe|checkout|webhook|process\.env/i);
});
