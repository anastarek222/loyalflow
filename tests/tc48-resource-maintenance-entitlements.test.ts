import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function action(sourceText: string, name: string, nextName?: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = nextName
    ? sourceText.indexOf(`export async function ${nextName}`, start)
    : sourceText.length;
  assert.ok(end > start, `${name} must have a bounded source slice`);
  return sourceText.slice(start, end);
}

const branchActions = source("app/businesses/[slug]/branches/actions.ts");
const branchCommand = source("lib/server/business/branch-maintenance-command.ts");
const offerActions = source("app/businesses/[slug]/offers/actions.ts");
const offerCommand = source("lib/server/business/offer-write-command.ts");
const rewardActions = source("app/businesses/[slug]/rewards/actions.ts");
const rewardCommand = source("lib/server/business/reward-write-command.ts");
const branchPage = source("app/businesses/[slug]/branches/page.tsx");
const offerPage = source("app/businesses/[slug]/offers/page.tsx");
const rewardPage = source("app/businesses/[slug]/rewards/page.tsx");

test("TC4.8 guards branch, offer, and reward maintenance as OPERATE", () => {
  for (const branchAction of [
    action(branchActions, "updateBranchAction", "setBranchStatusAction"),
    action(branchActions, "setBranchStatusAction", "assignStaffToBranchAction"),
  ]) {
    assert.match(branchAction, /canPerformSubscriptionOperation\(/);
    assert.match(branchAction, /"OPERATE"/);
    assert.match(branchAction, /subscription-restricted/);
  }
  assert.match(branchActions, /updateBranchCommand/);
  assert.match(branchActions, /setBranchStatusCommand/);
  assert.match(branchCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(branchCommand, /"OPERATE"/);
  assert.ok(
    branchCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      branchCommand.indexOf("transaction.branch.update"),
  );

  for (const offerAction of [
    action(offerActions, "updateOfferAction", "toggleOfferStatusAction"),
    action(offerActions, "toggleOfferStatusAction"),
  ]) {
    assert.match(offerAction, /canPerformSubscriptionOperation\(/);
    assert.match(offerAction, /"OPERATE"/);
    assert.match(offerAction, /subscription-restricted/);
  }
  assert.match(offerActions, /updateOfferCommand\(/);
  assert.match(offerActions, /setOfferStatusCommand\(/);
  assert.match(offerCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(offerCommand, /"OPERATE"/);
  assert.ok(
    offerCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      offerCommand.indexOf("transaction.offer.update"),
  );

  for (const rewardAction of [
    action(rewardActions, "updateRewardAction", "toggleRewardStatusAction"),
    action(rewardActions, "toggleRewardStatusAction"),
  ]) {
    assert.match(rewardAction, /canPerformSubscriptionOperation\(/);
    assert.match(rewardAction, /"OPERATE"/);
    assert.match(rewardAction, /subscription-restricted/);
  }
  assert.match(rewardActions, /updateRewardCommand\(/);
  assert.match(rewardActions, /setRewardStatusCommand\(/);
  assert.match(rewardCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(rewardCommand, /"OPERATE"/);
  assert.ok(
    rewardCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      rewardCommand.indexOf("transaction.reward.update"),
  );
});

test("TC4.8 keeps expansion and maintenance classifications separate", () => {
  for (const sourceText of [branchActions, offerActions, rewardActions]) {
    assert.match(sourceText, /"EXPAND"/);
  }
  assert.match(
    action(branchActions, "updateBranchAction", "setBranchStatusAction"),
    /"OPERATE"/,
  );
  assert.match(branchCommand, /"OPERATE"/);
  assert.match(offerCommand, /"EXPAND"/);
  assert.match(offerCommand, /"OPERATE"/);
  assert.match(rewardCommand, /"EXPAND"/);
  assert.match(rewardCommand, /"OPERATE"/);
});

test("TC4.8 exposes bounded restriction feedback without provider behavior", () => {
  for (const page of [branchPage, offerPage, rewardPage]) {
    assert.match(page, /query\.error === "subscription-restricted"/);
  }
  assert.doesNotMatch(
    `${branchActions}\n${branchCommand}\n${offerActions}\n${offerCommand}\n${rewardActions}\n${rewardCommand}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
