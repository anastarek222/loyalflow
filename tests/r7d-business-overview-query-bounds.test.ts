import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const overview = source("app/businesses/[slug]/page.tsx");
const rewardTarget = source("lib/dashboard/business-reward-target.ts");
const unreadSummary = source("lib/dashboard/business-unread-summary.ts");

test("R7D bounds the Business Overview reward target lookup", () => {
  assert.match(overview, /getBusinessRewardTargetCost\(\{/);
  assert.doesNotMatch(overview, /prisma\.reward\.findMany\(/);
  assert.match(rewardTarget, /prisma\.reward\.findFirst\(/);
  assert.match(rewardTarget, /where: \{ businessId: input\.businessId, isActive: true \}/);
  assert.match(rewardTarget, /orderBy: \[\{ cost: "asc" \}, \{ id: "asc" \}\]/);
  assert.match(rewardTarget, /select: \{ cost: true \}/);
  assert.match(
    rewardTarget,
    /Math\.max\(1, Math\.trunc\(reward\?\.cost \?\? input\.fallbackThreshold\)\)/,
  );
});

test("R7D keeps individual read presentation lookups bounded to visible keys", () => {
  assert.match(overview, /const visibleNotificationKeys = Array\.from\(/);
  assert.match(overview, /notificationKey: \{ in: visibleNotificationKeys \}/);
  assert.match(overview, /take: visibleNotificationKeys\.length/);
  assert.match(overview, /recentNotifications\.map/);
  assert.match(overview, /rewardReadyCustomers\.map\(notificationKeyForRewardReady\)/);
  assert.match(overview, /rewardRedeemedActivities\.map/);
  assert.match(overview, /balanceAdjustedActivities\.map/);
  assert.match(overview, /loyaltyEarnedActivities\.map/);
});

test("R7D moves exact unread exclusions into database-side key checks", () => {
  assert.match(unreadSummary, /FROM "NotificationItemRead" item_read/);
  assert.match(unreadSummary, /CONCAT\('notification:', notification\.id\)/);
  assert.match(unreadSummary, /CONCAT\('activity:', activity\.id\)/);
  assert.match(unreadSummary, /CONCAT\(\s*'reward-ready:'/);
  assert.match(unreadSummary, /item_read\."userId" = \$\{/);
  assert.match(unreadSummary, /item_read\."businessId" = \$\{/);
  assert.match(unreadSummary, /item_read\."readAt" > \$\{/);
});

test("R7D parallelizes the independent read-state and reward-target prerequisites", () => {
  assert.match(
    overview,
    /const \[readState, rewardTargetCost\] = await Promise\.all\(\[/,
  );
});
