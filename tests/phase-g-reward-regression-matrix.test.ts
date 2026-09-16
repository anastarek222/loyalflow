import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getRewardTruth,
  type RewardAvailabilityOption,
} from "../lib/rewards/availability";

const fallbackReward = { name: "Fallback", cost: 10 };
const catalogueReward = {
  id: "catalogue",
  name: "Coffee",
  cost: 10,
  isActive: true,
  expiresAfterDays: null,
} as const;

function truth(
  balance: number,
  rewards: readonly RewardAvailabilityOption[] = [catalogueReward],
) {
  return getRewardTruth({
    customerActive: true,
    balance,
    rewardThreshold: 10,
    fallbackReward,
    catalogueRewards: rewards,
    rewardUnlocks: [],
  });
}

test("Phase G locks balance below, equal, and above reward cost", () => {
  const below = truth(9);
  assert.equal(below.rewardReady, false);
  assert.equal(below.remaining, 1);
  assert.deepEqual(below.redeemableRewards, []);

  for (const balance of [10, 11]) {
    const result = truth(balance);
    assert.equal(result.rewardReady, true);
    assert.equal(result.remaining, 0);
    assert.deepEqual(
      result.redeemableRewards.map((reward) => reward.id),
      ["catalogue"],
    );
  }
});

test("Phase G last active catalogue deactivation restores the fallback contract", () => {
  const result = truth(10, [{ ...catalogueReward, isActive: false }]);
  assert.equal(result.source, "FALLBACK");
  assert.equal(result.defaultReward.id, null);
  assert.equal(result.defaultReward.name, "Fallback");
  assert.equal(result.rewardReady, true);
});

test("Phase G redeemed and expired entitlement rows cannot make an expiring reward redeemable", () => {
  const now = new Date("2026-09-15T00:00:00.000Z");
  const reward = { ...catalogueReward, expiresAfterDays: 7 };
  const baseUnlock = {
    rewardId: reward.id,
    expiresAt: new Date("2026-09-16T00:00:00.000Z"),
    redeemedAt: null,
    expiredAt: null,
  };

  for (const unlock of [
    { ...baseUnlock, redeemedAt: now },
    { ...baseUnlock, expiredAt: now },
    { ...baseUnlock, expiresAt: now },
  ]) {
    const result = getRewardTruth({
      customerActive: true,
      balance: 10,
      rewardThreshold: 10,
      fallbackReward,
      catalogueRewards: [reward],
      rewardUnlocks: [unlock],
      now,
    });
    assert.equal(result.rewardReady, false);
    assert.deepEqual(result.redeemableRewards, []);
  }
});

test("Phase G earned entitlement freezes every economic identity field", () => {
  const command = readFileSync(
    new URL("../lib/server/business/reward-write-command.ts", import.meta.url),
    "utf8",
  );

  for (const field of ["name", "type", "code", "cost", "expiresAfterDays"]) {
    assert.match(
      command,
      new RegExp(`existingReward\\.${field} !== input\\.reward\\.${field}`),
    );
  }
  assert.match(command, /reason: "ACTIVE_ENTITLEMENTS"/);
  assert.match(
    command,
    /existingReward\.isActive[\s\S]*?!input\.isActive[\s\S]*?hasLiveRewardEntitlements/,
  );
});
