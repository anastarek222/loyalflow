import assert from "node:assert/strict";
import test from "node:test";

import { rewardInputSchema } from "@/lib/rewards/catalog";

const baseReward = {
  name: "Test reward",
  cost: 100,
};

test("PROMO_CODE rewards require a code", () => {
  for (const code of [undefined, "", "   "]) {
    const result = rewardInputSchema.safeParse({
      ...baseReward,
      type: "PROMO_CODE",
      ...(code === undefined ? {} : { code }),
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(
        result.error.issues.some(
          (issue) =>
            issue.path[0] === "code" &&
            issue.message === "Code is required for promo code rewards",
        ),
        true,
      );
    }
  }
});

test("PROMO_CODE rewards accept a non-empty code", () => {
  const result = rewardInputSchema.safeParse({
    ...baseReward,
    type: "PROMO_CODE",
    code: "SAVE10",
  });

  assert.equal(result.success, true);
});

test("non-promo rewards may omit code", () => {
  const result = rewardInputSchema.safeParse({
    ...baseReward,
    type: "GIFT",
  });

  assert.equal(result.success, true);
});
