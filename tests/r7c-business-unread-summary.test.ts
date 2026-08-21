import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const overview = source("app/businesses/[slug]/page.tsx");
const summary = source("lib/dashboard/business-unread-summary.ts");

test("R7C keeps unread candidate row loads out of Business Overview", () => {
  assert.match(overview, /getBusinessUnreadSummary\(\{/);
  assert.match(overview, /after: notificationsLastReadAt/);
  assert.doesNotMatch(overview, /unreadRewardReadyCandidates/);
  assert.doesNotMatch(overview, /unreadActivityCandidates/);
});

test("R7C preserves individual activity read semantics in database counts", () => {
  assert.match(summary, /FROM "BusinessActivity" activity/);
  assert.match(summary, /FROM "NotificationItemRead" item_read/);
  assert.match(summary, /item_read\."readAt" > \$\{/);
  assert.match(
    summary,
    /item_read\."notificationKey" = CONCAT\('activity:', activity\.id\)/,
  );

  for (const type of ["REWARD_REDEEMED", "BALANCE_ADJUSTED", "LOYALTY_EARNED"]) {
    assert.match(summary, new RegExp(`activity\\.type::text = '${type}'`));
  }
});

test("R7C preserves reward-ready state-key semantics without loading candidate rows", () => {
  assert.match(summary, /FROM "Customer" customer/);
  assert.match(summary, /customer\.balance >= \$\{/);
  assert.match(summary, /customer\."updatedAt" > \$\{/);
  assert.match(summary, /CONCAT\(\s*'reward-ready:'/);
  assert.match(summary, /customer\.id/);
  assert.match(summary, /customer\.balance/);
  assert.match(summary, /customer\."lifetimeRedeemed"/);
  assert.doesNotMatch(summary, /\.findMany\(/);
});

test("R7C feeds the existing notification presentation from the summary counts", () => {
  for (const field of [
    "unreadNotificationCount",
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
