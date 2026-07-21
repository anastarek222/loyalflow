import assert from "node:assert/strict";
import test from "node:test";

import { RewardType } from "../generated/prisma/client";
import {
  getAvailableRewardOptions,
  normalizeRewardInput,
  rewardInputSchema,
} from "../lib/rewards/catalog";

const legacyReward = {
  name: "Free coffee",
  description: null,
  type: RewardType.GIFT,
  code: null,
  cost: 10,
};

test("uses the legacy reward until a business has catalogue rewards", () => {
  assert.deepEqual(
    getAvailableRewardOptions([], legacyReward),
    [{ id: null, ...legacyReward }]
  );
});

test("prefers the active catalogue supplied by the tenant query", () => {
  const catalogueReward = {
    id: "reward-1",
    name: "VIP discount",
    description: "20% off",
    type: RewardType.DISCOUNT,
    code: "VIP20",
    cost: 25,
  };

  assert.deepEqual(
    getAvailableRewardOptions([catalogueReward], legacyReward),
    [catalogueReward]
  );
});

test("normalizes optional reward fields without accepting invalid costs", () => {
  const parsed = rewardInputSchema.safeParse({
    name: "  Weekend reward ",
    description: "",
    type: RewardType.CUSTOM,
    code: "",
    cost: "15",
  });

  assert.equal(parsed.success, true);

  if (!parsed.success) {
    return;
  }

  assert.deepEqual(normalizeRewardInput(parsed.data), {
    name: "Weekend reward",
    description: null,
    type: RewardType.CUSTOM,
    code: null,
    cost: 15,
    expiresAfterDays: null,
  });

  assert.equal(
    rewardInputSchema.safeParse({
      name: "Broken reward",
      type: RewardType.GIFT,
      cost: 0,
    }).success,
    false
  );
});
