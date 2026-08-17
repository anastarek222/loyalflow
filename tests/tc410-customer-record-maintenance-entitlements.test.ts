import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const customerFacade = source(
  "app/businesses/[slug]/customers/[customerId]/actions.ts",
);
const recordActions = source(
  "app/businesses/[slug]/customers/[customerId]/customer-record-actions.ts",
);
const noteActions = source(
  "app/businesses/[slug]/customers/[customerId]/note-actions.ts",
);
const recordCommand = source(
  "lib/server/business/customer-record-maintenance-command.ts",
);
const noteCommand = source(
  "lib/server/business/customer-note-write-command.ts",
);
const customerPage = source(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
);

test("TC4.10 guards customer profile and note maintenance as OPERATE", () => {
  assert.match(customerFacade, /updateCustomerRecordCommandAction/);
  assert.match(customerFacade, /createCustomerNoteCommandAction/);
  assert.match(customerFacade, /updateCustomerNoteCommandAction/);
  assert.doesNotMatch(customerFacade, /actions-legacy|legacy\./);

  assert.match(recordActions, /canPerformSubscriptionOperation\(/);
  assert.match(recordActions, /"OPERATE"/);
  assert.match(recordActions, /updateCustomerRecordCommand/);
  assert.match(recordActions, /subscription-restricted/);
  assert.match(recordCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(recordCommand, /"OPERATE"/);
  assert.ok(
    recordCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      recordCommand.indexOf("transaction.customer.update"),
  );

  assert.match(noteActions, /canPerformSubscriptionOperation\(/);
  assert.match(noteActions, /"OPERATE"/);
  assert.match(noteActions, /createCustomerNoteCommand/);
  assert.match(noteActions, /updateCustomerNoteCommand/);
  assert.match(noteActions, /subscription-restricted/);
  assert.match(noteCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(noteCommand, /"OPERATE"/);
  assert.ok(
    noteCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      noteCommand.indexOf("transaction.customerNote.create"),
  );
  assert.ok(
    noteCommand.lastIndexOf("await canBusinessPerformSubscriptionOperation") <
      noteCommand.indexOf("transaction.customerNote.update"),
  );
});

test("TC4.10 preserves customer deactivation safety", () => {
  assert.match(
    recordActions,
    /parsedStatus\.data &&[\s\S]*canPerformSubscriptionOperation/,
  );
  assert.match(recordActions, /setCustomerRecordStatusCommand/);
  assert.match(recordCommand, /input\.isActive &&[\s\S]*canBusinessPerformSubscriptionOperation/);
  assert.match(recordCommand, /isActive: input\.isActive/);
});

test("TC4.10 exposes bounded feedback without provider or schema behavior", () => {
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.match(customerPage, /security controls remain accessible/);
  assert.doesNotMatch(
    `${customerFacade}\n${recordActions}\n${noteActions}\n${recordCommand}\n${noteCommand}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
