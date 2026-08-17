import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function action(sourceText: string, name: string, nextName: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  const end = sourceText.indexOf(`export async function ${nextName}`, start);
  assert.ok(start >= 0 && end > start);
  return sourceText.slice(start, end);
}

const actions = source(
  "app/businesses/[slug]/customers/[customerId]/actions.ts",
);
const referralAction = action(
  actions,
  "createCustomerReferralCodeAction",
  "createAndAssignCustomerTagAction",
);
const command = source(
  "lib/server/business/customer-referral-code-command.ts",
);

test("TC5 Customer referral extraction preserves the active action contract until wiring", () => {
  assert.match(referralAction, /customerReferralCode\.findUnique/);
  assert.match(referralAction, /canPerformSubscriptionOperation/);
  assert.match(referralAction, /canBusinessPerformSubscriptionOperation/);
  assert.match(referralAction, /prisma\.\$transaction/);
  assert.match(referralAction, /transaction\.customerReferralCode\.create/);
  assert.match(referralAction, /error\.code === "P2002"/);
  assert.doesNotMatch(referralAction, /ensureCustomerReferralCodeCommand/);
});

test("TC5 Customer referral command keeps existing replay before persisted EXPAND enforcement", () => {
  const customer = command.indexOf("transaction.customer.findFirst");
  const existing = command.indexOf(
    "transaction.customerReferralCode.findUnique",
  );
  const existingReturn = command.indexOf('state: "EXISTING"');
  const guard = command.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const create = command.indexOf("transaction.customerReferralCode.create");

  for (const position of [customer, existing, existingReturn, guard, create]) {
    assert.ok(position >= 0);
  }
  assert.ok(customer < existing);
  assert.ok(existing < existingReturn);
  assert.ok(existingReturn < guard);
  assert.ok(guard < create);
  assert.match(command, /businessId: input\.businessId/);
  assert.match(command, /"EXPAND"/);
  assert.match(command, /"TARGET_NOT_FOUND"/);
  assert.match(command, /"SUBSCRIPTION_RESTRICTED"/);
});

test("TC5 Customer referral command preserves bounded unique-conflict recovery", () => {
  assert.match(command, /attempt < 10/);
  assert.match(command, /error\.code === "P2002"/);
  assert.match(command, /codeCreatedByAnotherRequest/);
  assert.match(command, /state: "CREATED"/);
  assert.match(command, /state: "EXISTING"/);
  assert.match(command, /"CREATE_FAILED"/);
  assert.ok(
    command.indexOf("codeCreatedByAnotherRequest") <
      command.indexOf('reason: "CREATE_FAILED"'),
  );
});

test("TC5 Customer referral command has no provider, environment, or audit invention", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.doesNotMatch(command, /businessActivity/);
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
});
