import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const command = readFileSync(
  new URL("../lib/server/business/reward-write-command.ts", import.meta.url),
  "utf8",
);
const action = readFileSync(
  new URL("../app/businesses/[slug]/rewards/actions.ts", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../app/businesses/[slug]/rewards/page.tsx", import.meta.url),
  "utf8",
);

test("live earned entitlements freeze reward economic identity", () => {
  assert.match(
    command,
    /hasLiveRewardEntitlements[\s\S]*rewardUnlock\.count\([\s\S]*redeemedAt: null[\s\S]*expiredAt: null[\s\S]*expiresAt: \{ gt: new Date\(\) \}/,
  );
  assert.match(
    command,
    /changesEarnedEntitlement[\s\S]*existingReward\.name !== input\.reward\.name[\s\S]*existingReward\.cost !== input\.reward\.cost[\s\S]*existingReward\.expiresAfterDays !== input\.reward\.expiresAfterDays/,
  );
  assert.match(
    command,
    /changesEarnedEntitlement &&[\s\S]*hasLiveRewardEntitlements[\s\S]*reason: "ACTIVE_ENTITLEMENTS"/,
  );
});

test("live entitlements block deactivation but allow later activation", () => {
  assert.match(
    command,
    /existingReward\.isActive &&[\s\S]*!input\.isActive &&[\s\S]*hasLiveRewardEntitlements[\s\S]*reason: "ACTIVE_ENTITLEMENTS"/,
  );
});

test("the bounded action and owner UI expose the explicit conflict", () => {
  assert.match(action, /case "ACTIVE_ENTITLEMENTS":[\s\S]*"active-entitlements"/);
  assert.match(page, /query\.error === "active-entitlements"/);
  assert.match(page, /live earned entitlements/);
});
