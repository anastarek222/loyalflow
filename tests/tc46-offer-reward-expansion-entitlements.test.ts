import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const offerActions = source("app/businesses/[slug]/offers/actions.ts");
const rewardActions = source("app/businesses/[slug]/rewards/actions.ts");
const offerPage = source("app/businesses/[slug]/offers/page.tsx");
const rewardPage = source("app/businesses/[slug]/rewards/page.tsx");

test("TC4.6 guards offer and reward expansion before authoritative writes", () => {
  for (const [sourceText, mutation] of [
    [offerActions, "transaction.offer.create"],
    [rewardActions, "transaction.reward.create"],
  ] as const) {
    assert.match(sourceText, /subscriptionLifecycleState: true/);
    assert.match(sourceText, /canPerformSubscriptionOperation\(/);
    assert.match(sourceText, /canBusinessPerformSubscriptionOperation\(/);
    assert.match(sourceText, /"EXPAND"/);
    assert.ok(
      sourceText.indexOf("await canBusinessPerformSubscriptionOperation") <
        sourceText.indexOf(mutation),
    );
    assert.match(sourceText, /subscription-restricted/);
  }
});

test("TC4.6 retains plan, tenant, capability, and audit boundaries", () => {
  assert.match(offerActions, /hasFeatureEntitlement\(business\.plan, "OFFERS"\)/);
  assert.match(rewardActions, /hasFeatureEntitlement\(business\.plan, "REWARDS"\)/);
  for (const sourceText of [offerActions, rewardActions]) {
    assert.match(sourceText, /canManageBusiness\(session\.user, business\.id\)/);
    assert.match(sourceText, /isWithinPlanLimit\(/);
    assert.match(sourceText, /transaction\.businessActivity\.create/);
  }
});

test("TC4.6 exposes bilingual bounded restriction feedback", () => {
  for (const page of [offerPage, rewardPage]) {
    assert.match(page, /query\.error === "subscription-restricted"/);
    assert.match(page, /language === "AR"/);
  }
  assert.doesNotMatch(
    `${offerActions}\n${rewardActions}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
