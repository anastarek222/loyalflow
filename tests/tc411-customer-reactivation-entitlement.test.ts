import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function action(sourceText: string, name: string, nextName: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = sourceText.indexOf(`export async function ${nextName}`, start);
  assert.ok(end > start, `${name} must have a bounded source slice`);
  return sourceText.slice(start, end);
}

const customerActions = source(
  "app/businesses/[slug]/customers/[customerId]/actions-legacy.ts",
);
const statusAction = action(
  customerActions,
  "setCustomerStatusAction",
  "adjustCustomerBalanceAction",
);
const customerPage = source(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
);

test("TC4.11 guards customer reactivation as OPERATE before authoritative writes", () => {
  assert.match(
    statusAction,
    /parsedStatus\.data &&[\s\S]*canPerformSubscriptionOperation\(/,
  );
  assert.match(
    statusAction,
    /parsedStatus\.data &&[\s\S]*canBusinessPerformSubscriptionOperation\(/,
  );
  assert.match(statusAction, /"OPERATE"/);
  assert.match(statusAction, /subscription-restricted/);
  assert.ok(
    statusAction.indexOf("await canBusinessPerformSubscriptionOperation") <
      statusAction.indexOf("transaction.customer.update"),
  );
});

test("TC4.11 preserves customer deactivation as an unrestricted safety control", () => {
  assert.match(statusAction, /parsedStatus\.data &&/);
  assert.match(statusAction, /isActive: parsedStatus\.data/);
  assert.match(statusAction, /CUSTOMER_DEACTIVATED/);
  assert.match(statusAction, /CUSTOMER_REACTIVATED/);
  assert.doesNotMatch(statusAction, /prisma\.\$transaction\(\[/);
});

test("TC4.11 reuses bounded feedback without provider or schema behavior", () => {
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.match(customerPage, /security controls remain accessible/);
  assert.doesNotMatch(statusAction, /stripe|checkout|webhook|process\.env/i);
});
