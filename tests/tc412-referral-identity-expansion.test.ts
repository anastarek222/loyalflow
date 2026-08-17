import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const facade = source(
  "app/businesses/[slug]/customers/[customerId]/actions.ts",
);
const referralAction = source(
  "app/businesses/[slug]/customers/[customerId]/referral-actions.ts",
);
const referralCommand = source(
  "lib/server/business/customer-referral-code-command.ts",
);
const tagActions = source(
  "app/businesses/[slug]/customers/[customerId]/tag-actions.ts",
);
const tagCommand = source("lib/server/business/customer-tag-write-command.ts");
const customerPage = source(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
);

test("TC4.12 guards new referral identity creation as EXPAND", () => {
  assert.match(facade, /createCustomerReferralCodeCommandAction/);
  assert.match(referralAction, /canPerformSubscriptionOperation\(/);
  assert.match(referralAction, /"EXPAND"/);
  assert.match(referralAction, /subscription-restricted/);
  assert.match(referralCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(referralCommand, /"EXPAND"/);
  assert.ok(
    referralCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      referralCommand.indexOf("transaction.customerReferralCode.create"),
  );
});

test("TC4.12 preserves existing-code replay before expansion enforcement", () => {
  assert.ok(
    referralCommand.indexOf("customerReferralCode.findUnique") <
      referralCommand.indexOf("canBusinessPerformSubscriptionOperation"),
  );
  assert.match(referralCommand, /if \(existing\)/);
  assert.match(referralCommand, /error\.code === "P2002"/);
  assert.match(referralCommand, /codeCreatedByAnotherRequest/);
});

test("TC4.12 preserves provider boundaries alongside command-backed tag topology guards", () => {
  assert.match(facade, /createAndAssignCustomerTagCommandAction/);
  assert.match(facade, /assignCustomerTagCommandAction/);
  assert.match(facade, /removeCustomerTagCommandAction/);
  assert.match(tagActions, /canPerformSubscriptionOperation/);
  assert.match(tagCommand, /canBusinessPerformSubscriptionOperation/);
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.doesNotMatch(
    `${referralAction}\n${referralCommand}\n${tagActions}\n${tagCommand}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
