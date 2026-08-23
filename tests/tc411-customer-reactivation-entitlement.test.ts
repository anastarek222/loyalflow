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
const recordCommand = source(
  "lib/server/business/customer-record-maintenance-command.ts",
);
const customerPage = source(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
);

test("TC4.11 guards customer reactivation as OPERATE before authoritative writes", () => {
  assert.match(customerFacade, /setCustomerRecordStatusCommandAction/);
  assert.doesNotMatch(customerFacade, /actions-legacy|legacy\./);
  assert.match(
    recordActions,
    /parsedStatus\.data &&[\s\S]*canPerformSubscriptionOperation\(/,
  );
  assert.match(recordActions, /setCustomerRecordStatusCommand/);
  assert.match(recordCommand, /input\.isActive &&[\s\S]*canBusinessPerformSubscriptionOperation\(/);
  assert.match(recordCommand, /"OPERATE"/);
  assert.match(recordActions, /subscription-restricted/);
  assert.ok(
    recordCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      recordCommand.indexOf("transaction.customer.update"),
  );
});

test("TC4.11 preserves customer deactivation as an unrestricted safety control", () => {
  assert.match(recordActions, /parsedStatus\.data &&/);
  assert.match(recordActions, /setCustomerRecordStatusCommand/);
  assert.match(recordCommand, /isActive: input\.isActive/);
  assert.match(recordCommand, /CUSTOMER_DEACTIVATED/);
  assert.match(recordCommand, /CUSTOMER_REACTIVATED/);
  assert.doesNotMatch(recordCommand, /prisma\.\$transaction\(\[/);
});

test("TC4.11 reuses bounded feedback without provider or schema behavior", () => {
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.match(customerPage, /security controls remain accessible/);
  assert.doesNotMatch(
    `${customerFacade}\n${recordActions}\n${recordCommand}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
