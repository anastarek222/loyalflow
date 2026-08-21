import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const overview = source("app/businesses/[slug]/page.tsx");
const summary = source("lib/dashboard/business-unread-summary.ts");

test("R7C removes unread candidate row loads from Business Overview", () => {
  assert.match(overview, /getBusinessUnreadSummary\(\{/);
  assert.match(overview, /after: notificationsLastReadAt/);
  assert.match(overview, /individuallyReadKeys/);
  assert.doesNotMatch(overview, /unreadRewardReadyCandidates/);
  assert.doesNotMatch(overview, /unreadActivityCandidates/);
});

test("R7C preserves individual activity read semantics with count queries", () => {
  assert.match(summary, /parseNotificationReadKey/);
  assert.match(summary, /parsed\?\.kind === "activity"/);
  assert.match(summary, /activityReadIds\.push\(parsed\.activityId\)/);
  assert.match(summary, /createdAt: \{ gt: input\.after \}/);
  assert.match(summary, /id: \{ notIn: activityReadIds \}/);

  for (const type of ["REWARD_REDEEMED", "BALANCE_ADJUSTED", "LOYALTY_EARNED"]) {
    assert.match(summary, new RegExp(`type: "${type}"`));
  }
});

test("R7C preserves reward-ready state-key semantics without loading candidate rows", () => {
  assert.match(summary, /parsed\?\.kind === "reward-ready"/);
  assert.match(summary, /rewardReadyReadStates\.push\(parsed\)/);
  assert.match(summary, /updatedAt: \{ gt: input\.after \}/);
  assert.match(summary, /balance: \{ gte: input\.rewardTargetCost \}/);
  assert.match(summary, /id: target\.customerId/);
  assert.match(summary, /balance: target\.balance/);
  assert.match(summary, /lifetimeRedeemed: target\.lifetimeRedeemed/);
  assert.match(summary, /prisma\.customer\.count\(/);
  assert.doesNotMatch(summary, /\.findMany\(/);
});

test("R7C feeds the existing notification presentation from the summary counts", () => {
  for (const field of [
    "unreadRewardReadyCount",
    "unreadRewardRedeemedCount",
    "unreadBalanceAdjustedCount",
    "unreadLoyaltyEarnedCount",
    "unreadActivityCount",
  ]) {
    assert.match(overview, new RegExp(field));
  }

  assert.match(
    overview,
    /unreadCount =\s*unreadNotificationCount \+ unreadRewardReadyCount \+ unreadActivityCount/,
  );
});
