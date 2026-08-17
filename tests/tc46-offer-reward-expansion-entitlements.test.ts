import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const offerActions = source("app/businesses/[slug]/offers/actions.ts");
const offerCommand = source("lib/server/business/offer-write-command.ts");
const rewardActions = source("app/businesses/[slug]/rewards/actions.ts");
const rewardCommand = source("lib/server/business/reward-write-command.ts");
const offerPage = source("app/businesses/[slug]/offers/page.tsx");
const rewardPage = source("app/businesses/[slug]/rewards/page.tsx");

test("TC4.6 guards offer and reward expansion before authoritative writes", () => {
  assert.match(offerActions, /subscriptionLifecycleState: true/);
  assert.match(offerActions, /canPerformSubscriptionOperation\(/);
  assert.match(offerActions, /"EXPAND"/);
  assert.match(offerActions, /subscription-restricted/);
  assert.match(offerActions, /createOfferCommand\(/);

  assert.match(offerCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(offerCommand, /"EXPAND"/);
  assert.ok(
    offerCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      offerCommand.indexOf("transaction.offer.create"),
  );

  assert.match(rewardActions, /subscriptionLifecycleState: true/);
  assert.match(rewardActions, /canPerformSubscriptionOperation\(/);
  assert.match(rewardActions, /"EXPAND"/);
  assert.match(rewardActions, /subscription-restricted/);
  assert.match(rewardActions, /createRewardCommand\(/);

  assert.match(rewardCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(rewardCommand, /"EXPAND"/);
  assert.ok(
    rewardCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      rewardCommand.indexOf("transaction.reward.create"),
  );
});

test("TC4.6 retains plan, tenant, capability, and audit boundaries", () => {
  assert.match(offerActions, /hasFeatureEntitlement\(business\.plan, "OFFERS"\)/);
  assert.match(offerActions, /isWithinPlanLimit\(/);
  assert.match(offerActions, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(offerCommand, /hasFeatureEntitlement\(business\.plan, "OFFERS"\)/);
  assert.match(offerCommand, /isWithinPlanLimit\(/);
  assert.match(offerCommand, /transaction\.businessActivity\.create/);

  assert.match(rewardActions, /hasFeatureEntitlement\(business\.plan, "REWARDS"\)/);
  assert.match(rewardActions, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(rewardActions, /isWithinPlanLimit\(/);
  assert.match(rewardCommand, /hasFeatureEntitlement\(business\.plan, "REWARDS"\)/);
  assert.match(rewardCommand, /isWithinPlanLimit\(/);
  assert.match(rewardCommand, /transaction\.businessActivity\.create/);
});

test("TC4.6 exposes bilingual bounded restriction feedback", () => {
  for (const page of [offerPage, rewardPage]) {
    assert.match(page, /query\.error === "subscription-restricted"/);
    assert.match(page, /language === "AR"/);
  }
  assert.doesNotMatch(
    `${offerActions}\n${offerCommand}\n${rewardActions}\n${rewardCommand}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
