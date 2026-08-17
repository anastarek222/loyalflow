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
const recordCommand = source(
  "lib/server/business/customer-record-maintenance-command.ts",
);
const customerPage = source(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
);

test("TC4.10 guards customer profile and note maintenance as OPERATE", () => {
  const updateProfile = action(
    customerActions,
    "updateCustomerAction",
    "setCustomerStatusAction",
  );
  assert.match(updateProfile, /canPerformSubscriptionOperation\(/);
  assert.match(updateProfile, /"OPERATE"/);
  assert.match(updateProfile, /updateCustomerRecordCommand/);
  assert.match(updateProfile, /subscription-restricted/);
  assert.match(recordCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(recordCommand, /"OPERATE"/);
  assert.ok(
    recordCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      recordCommand.indexOf("transaction.customer.update"),
  );

  for (const [name, nextName, mutation] of [
    ["createCustomerNoteAction", "updateCustomerNoteAction", "transaction.customerNote.create"],
    ["updateCustomerNoteAction", "addLoyaltyAction", "transaction.customerNote.update"],
  ] as const) {
    const noteAction = action(customerActions, name, nextName);
    assert.match(noteAction, /canPerformSubscriptionOperation\(/);
    assert.match(noteAction, /canBusinessPerformSubscriptionOperation\(/);
    assert.match(noteAction, /"OPERATE"/);
    assert.match(noteAction, /subscription-restricted/);
    assert.ok(
      noteAction.indexOf("await canBusinessPerformSubscriptionOperation") <
        noteAction.indexOf(mutation),
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
  assert.match(statusAction, /setCustomerRecordStatusCommand/);
  assert.match(recordCommand, /input\.isActive &&[\s\S]*canBusinessPerformSubscriptionOperation/);
  assert.match(recordCommand, /isActive: input\.isActive/);
});

test("TC4.10 exposes bounded feedback without provider or schema behavior", () => {
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.match(customerPage, /security controls remain accessible/);
  assert.doesNotMatch(`${customerActions}\n${recordCommand}`, /stripe|checkout|webhook|process\.env/i);
});
