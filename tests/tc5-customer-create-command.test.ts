import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source("app/businesses/[slug]/customers/actions.ts");
const command = source("lib/server/business/customer-create-command.ts");
const createAction = actions.slice(
  actions.indexOf("export async function createCustomerAction"),
);

test("TC5 Customer create action keeps auth, parsing and presentation preflights while delegating persistence", () => {
  assert.match(createAction, /auth\(\)/);
  assert.match(createAction, /canPerform\(session\.user, business\.id, "CUSTOMERS_EDIT"\)/);
  assert.match(createAction, /canPerformSubscriptionOperation[\s\S]*"EXPAND"/);
  assert.match(createAction, /parseCustomerRegistration/);
  assert.match(createAction, /businessId_phone/);
  assert.match(createAction, /isWithinPlanLimit/);
  assert.match(createAction, /createCustomerCommand/);
  assert.doesNotMatch(createAction, /prisma\.\$transaction/);
  assert.doesNotMatch(createAction, /transaction\.customer\.create/);
  assert.doesNotMatch(createAction, /transaction\.businessActivity\.create/);
});

test("TC5 Customer create command rechecks persisted EXPAND, duplicate and plan limit before mutation", () => {
  const guard = command.indexOf("await canBusinessPerformSubscriptionOperation");
  const business = command.indexOf("transaction.business.findUnique");
  const duplicate = command.indexOf("transaction.customer.findUnique");
  const count = command.indexOf("transaction.customer.count");
  const code = command.indexOf("generateCustomerCode");
  const create = command.indexOf("transaction.customer.create");
  const audit = command.indexOf("transaction.businessActivity.create");

  for (const position of [guard, business, duplicate, count, code, create, audit]) {
    assert.ok(position >= 0);
  }
  assert.ok(guard < business);
  assert.ok(business < duplicate);
  assert.ok(duplicate < count);
  assert.ok(count < code);
  assert.ok(code < create);
  assert.ok(create < audit);
  assert.match(command, /"SUBSCRIPTION_RESTRICTED"/);
  assert.match(command, /"DUPLICATE"/);
  assert.match(command, /"PLAN_LIMIT"/);
  assert.match(command, /"CUSTOMERS"/);
});

test("TC5 Customer creation keeps code generation plus Customer/audit write inside one transaction", () => {
  assert.match(command, /return prisma\.\$transaction\(async \(transaction\) =>/);
  assert.match(
    command,
    /generateCustomerCode\([\s\S]*transaction,[\s\S]*input\.businessId,[\s\S]*business\.slug/,
  );
  assert.match(command, /type: "CUSTOMER_CREATED"/);
  assert.match(command, /customerId: customer\.id/);
  assert.match(command, /publicToken: customer\.publicToken/);
});

test("TC5 Customer create keeps Google Sheets as post-commit integration, not command persistence", () => {
  const delegated = createAction.indexOf("await createCustomerCommand");
  const sync = createAction.indexOf("await syncBusinessToGoogleSheetSafely");
  assert.ok(delegated >= 0 && sync > delegated);
  assert.doesNotMatch(command, /google|sheet|syncBusinessToGoogleSheetSafely/i);
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
});
