import assert from "node:assert/strict";
import test from "node:test";

import { calculateRewardProgress } from "../lib/loyalty/progress";

test("starts a customer at zero progress", () => {
  assert.deepEqual(calculateRewardProgress(0, 5), {
    progress: 0,
    remaining: 5,
    rewardAvailable: false,
  });
});

test("marks a customer reward ready exactly at the threshold", () => {
  assert.deepEqual(calculateRewardProgress(5, 5), {
    progress: 100,
    remaining: 0,
    rewardAvailable: true,
  });
});

test("keeps reward progress valid across repeated reward cycles", () => {
  assert.deepEqual(calculateRewardProgress(12, 5), {
    progress: 100,
    remaining: 0,
    rewardAvailable: true,
  });

  assert.deepEqual(calculateRewardProgress(7, 5), {
    progress: 100,
    remaining: 0,
    rewardAvailable: true,
  });

  assert.deepEqual(calculateRewardProgress(2, 5), {
    progress: 40,
    remaining: 3,
    rewardAvailable: false,
  });
});

test("does not offer rewards for inactive customers", () => {
  assert.deepEqual(calculateRewardProgress(5, 5, false), {
    progress: 100,
    remaining: 0,
    rewardAvailable: false,
  });
});
