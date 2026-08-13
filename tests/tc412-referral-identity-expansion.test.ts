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
  "app/businesses/[slug]/customers/[customerId]/actions.ts",
);
const referralAction = action(
  customerActions,
  "createCustomerReferralCodeAction",
  "createAndAssignCustomerTagAction",
);
const customerPage = source(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
);

test("TC4.12 guards new referral identity creation as EXPAND", () => {
  assert.match(referralAction, /canPerformSubscriptionOperation\(/);
  assert.match(referralAction, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(referralAction, /"EXPAND"/);
  assert.match(referralAction, /subscription-restricted/);
  assert.ok(
    referralAction.indexOf("await canBusinessPerformSubscriptionOperation") <
      referralAction.indexOf("transaction.customerReferralCode.create"),
  );
});

test("TC4.12 preserves existing-code replay before expansion enforcement", () => {
  assert.ok(
    referralAction.indexOf("customerReferralCode.findUnique") <
      referralAction.indexOf("canPerformSubscriptionOperation"),
  );
  assert.match(referralAction, /if \(!existing\)/);
  assert.match(referralAction, /error\.code === "P2002"/);
  assert.match(referralAction, /codeCreatedByAnotherRequest/);
});

test("TC4.12 leaves tag topology and provider boundaries unchanged", () => {
  for (const [name, nextName] of [
    ["createAndAssignCustomerTagAction", "assignCustomerTagAction"],
    ["assignCustomerTagAction", "removeCustomerTagAction"],
    ["removeCustomerTagAction", "createCustomerNoteAction"],
  ] as const) {
    const tagAction = action(customerActions, name, nextName);
    assert.doesNotMatch(
      tagAction,
      /canBusinessPerformSubscriptionOperation/,
    );
  }
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.doesNotMatch(referralAction, /stripe|checkout|webhook|process\.env/i);
});
