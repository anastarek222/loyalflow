import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const earnReversal = source("lib/loyalty/earn-reversal.ts");
const redemptionReversal = source("lib/loyalty/redemption-reversal.ts");
const earnAction = source(
  "app/businesses/[slug]/customers/[customerId]/reversal-actions.ts",
);
const redemptionAction = source(
  "app/businesses/[slug]/customers/[customerId]/redemption-reversal-actions.ts",
);
const customerPage = source(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
);

test("TC4.7 guards new financial reversals after idempotent replay and before writes", () => {
  for (const [sourceText, firstMutation] of [
    [earnReversal, "transaction.customer.updateMany"],
    [redemptionReversal, "transaction.rewardUnlock.updateMany"],
  ] as const) {
    const replay = sourceText.indexOf('status: "REPLAYED"');
    const guard = sourceText.indexOf(
      "await canBusinessPerformSubscriptionOperation",
    );
    const mutation = sourceText.indexOf(firstMutation);

    assert.ok(replay >= 0);
    assert.ok(guard > replay);
    assert.ok(mutation > guard);
    assert.match(sourceText, /"OPERATE"/);
    assert.match(sourceText, /blocked\("SUBSCRIPTION_RESTRICTED"\)/);
  }
});

test("TC4.7 maps restricted reversals to bounded bilingual feedback", () => {
  assert.match(earnAction, /case "SUBSCRIPTION_RESTRICTED"/);
  assert.match(redemptionAction, /case "SUBSCRIPTION_RESTRICTED"/);
  assert.match(customerPage, /query\.error === "subscription-restricted"/);
  assert.match(customerPage, /language === "AR"/);
});

test("TC4.7 adds no provider, checkout, credential, or schema behavior", () => {
  assert.doesNotMatch(
    `${earnReversal}\n${redemptionReversal}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
