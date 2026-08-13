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
const offerActions = source("app/businesses/[slug]/offers/actions.ts");
const rewardActions = source("app/businesses/[slug]/rewards/actions.ts");
const branchPage = source("app/businesses/[slug]/branches/page.tsx");
const offerPage = source("app/businesses/[slug]/offers/page.tsx");
const rewardPage = source("app/businesses/[slug]/rewards/page.tsx");

test("TC4.8 guards branch, offer, and reward maintenance as OPERATE", () => {
  const guardedActions = [
    [action(branchActions, "updateBranchAction", "setBranchStatusAction"), "transaction.branch.update"],
    [action(branchActions, "setBranchStatusAction", "assignStaffToBranchAction"), "transaction.branch.update"],
    [action(offerActions, "updateOfferAction", "toggleOfferStatusAction"), "transaction.offer.update"],
    [action(offerActions, "toggleOfferStatusAction"), "transaction.offer.update"],
    [action(rewardActions, "updateRewardAction", "toggleRewardStatusAction"), "transaction.reward.update"],
    [action(rewardActions, "toggleRewardStatusAction"), "transaction.reward.update"],
  ] as const;

  for (const [sourceText, mutation] of guardedActions) {
    assert.match(sourceText, /canPerformSubscriptionOperation\(/);
    assert.match(sourceText, /canBusinessPerformSubscriptionOperation\(/);
    assert.match(sourceText, /"OPERATE"/);
    assert.match(sourceText, /subscription-restricted/);
    assert.ok(
      sourceText.indexOf("await canBusinessPerformSubscriptionOperation") <
        sourceText.indexOf(mutation),
    );
  }
});

test("TC4.8 keeps expansion and maintenance classifications separate", () => {
  for (const sourceText of [branchActions, offerActions, rewardActions]) {
    assert.match(sourceText, /"EXPAND"/);
  }
  assert.match(
    action(branchActions, "updateBranchAction", "setBranchStatusAction"),
    /"OPERATE"/,
  );
});

test("TC4.8 exposes bounded restriction feedback without provider behavior", () => {
  for (const page of [branchPage, offerPage, rewardPage]) {
    assert.match(page, /query\.error === "subscription-restricted"/);
  }
  assert.doesNotMatch(
    `${branchActions}\n${offerActions}\n${rewardActions}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
