import assert from "node:assert/strict";
import test from "node:test";

import { calculateRewardProgress as calculateDomainRewardProgress } from "@loyalflow/domain/loyalty/progress";
import { calculateRewardProgress as calculateLegacyRewardProgress } from "../lib/loyalty/progress";

test("exports reward progress from the domain package through the compatibility path", () => {
  assert.equal(calculateLegacyRewardProgress, calculateDomainRewardProgress);
});

test("keeps reward progress behavior inside the pure domain boundary", () => {
  assert.deepEqual(calculateDomainRewardProgress(12, 5), {
    progress: 100,
    remaining: 0,
    rewardAvailable: true,
  });
  assert.deepEqual(calculateDomainRewardProgress(-4, 0, false), {
    progress: 0,
    remaining: 1,
    rewardAvailable: false,
  });
});
