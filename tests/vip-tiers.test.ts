import assert from "node:assert/strict";
import test from "node:test";

import { getVipTier } from "@/lib/customers/vip-tiers";

test("assigns VIP tiers at deterministic reward-cycle thresholds", () => {
  assert.equal(getVipTier({ lifetimeEarned: 0, rewardThreshold: 5 }), "BRONZE");
  assert.equal(getVipTier({ lifetimeEarned: 25, rewardThreshold: 5 }), "SILVER");
  assert.equal(getVipTier({ lifetimeEarned: 50, rewardThreshold: 5 }), "GOLD");
  assert.equal(getVipTier({ lifetimeEarned: 100, rewardThreshold: 5 }), "PLATINUM");
});

test("keeps tier qualification safe for invalid thresholds and values", () => {
  assert.equal(getVipTier({ lifetimeEarned: -1, rewardThreshold: 0 }), "BRONZE");
  assert.equal(getVipTier({ lifetimeEarned: 20, rewardThreshold: 0 }), "PLATINUM");
});
