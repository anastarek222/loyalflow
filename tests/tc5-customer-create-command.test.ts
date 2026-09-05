import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source("app/businesses/[slug]/customers/actions.ts");
const command = source("lib/server/business/customer-create-command.ts");

function action(sourceText: string, name: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  return sourceText.slice(start);
}

const createCustomer = action(actions, "createCustomerAction");

test("TC5 Customer creation action keeps presentation checks and delegates the authoritative write", () => {
  assert.match(createCustomer, /canPerform\(session\.user, business\.id, "CUSTOMERS_EDIT"\)/);
  assert.match(createCustomer, /canPerformSubscriptionOperation/);
  assert.match(createCustomer, /parseCustomerRegistration/);
  assert.match(createCustomer, /isWithinPlanLimit/);
  assert.match(createCustomer, /createCustomerCommand/);
  assert.match(
    createCustomer,
    /scheduleIntegrationJobs\(creation\.integrationJobIds\)/,
  );
  assert.doesNotMatch(createCustomer, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(createCustomer, /prisma\.\$transaction/);
  assert.doesNotMatch(createCustomer, /transaction\.customer\.create/);
  assert.doesNotMatch(createCustomer, /businessActivity\.create/);
});

test("TC5 Customer creation command rechecks persisted lifecycle, duplicate and plan limit before write", () => {
  const businessRead = command.indexOf("transaction.business.findUnique");
  const entitlement = command.indexOf("await canBusinessPerformSubscriptionOperation");
  const duplicate = command.indexOf("transaction.customer.findUnique");
  const configuration = command.indexOf("transaction.planConfiguration.findUnique");
  const count = command.indexOf("transaction.customer.count");
  const limit = command.indexOf("isWithinPlanLimit(");
  const create = command.indexOf("transaction.customer.create");

  for (const position of [
    businessRead,
    entitlement,
    duplicate,
    configuration,
    count,
    limit,
    create,
  ]) {
    assert.ok(position >= 0);
  }

  assert.ok(businessRead < entitlement);
  assert.ok(entitlement < duplicate);
  assert.ok(duplicate < configuration);
  assert.ok(configuration < limit);
  assert.ok(count < limit);
  assert.ok(limit < create);
  assert.match(command, /"EXPAND"/);
  assert.match(command, /"DUPLICATE"/);
  assert.match(command, /"PLAN_LIMIT"/);
  assert.match(command, /"SUBSCRIPTION_RESTRICTED"/);
});

test("TC5 Customer creation keeps the customer write and activity audit atomic", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /transaction\.customer\.create/);
  assert.match(command, /type: "CUSTOMER_CREATED"/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.ok(
    command.indexOf("transaction.customer.create") <
      command.indexOf("transaction.businessActivity.create"),
  );
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
});
