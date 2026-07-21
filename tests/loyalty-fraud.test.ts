import assert from "node:assert/strict";
import test from "node:test";
import {
  getRapidEarnCutoff,
  getRapidEarnRateLimitKey,
  getRapidEarnWhere,
  getRapidRedemptionRateLimitKey,
  getRapidRedemptionWhere,
  isUnusualManualAdjustment,
  RAPID_EARN_WINDOW_MS,
} from "@/lib/loyalty/fraud";

test("uses a short fixed window for duplicate earn detection", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");
  const cutoff = getRapidEarnCutoff(now);

  assert.equal(
    cutoff.getTime(),
    now.getTime() - RAPID_EARN_WINDOW_MS
  );
  assert.equal(RAPID_EARN_WINDOW_MS, 5_000);
});

test("flags manual adjustments at or above one full reward threshold", () => {
  assert.equal(isUnusualManualAdjustment(5, 5), true);
  assert.equal(isUnusualManualAdjustment(-7, 5), true);
  assert.equal(isUnusualManualAdjustment(4, 5), false);
});

test("scopes rapid redemption checks and stores redemption amounts as negative", () => {
  const input = {
    businessId: "business-1",
    customerId: "customer-1",
    createdById: "staff-1",
    cost: 5,
  };
  const now = new Date("2026-07-20T12:00:00.000Z");

  assert.equal(
    getRapidRedemptionRateLimitKey(input),
    "reward-redemption:business-1:customer-1:staff-1:5"
  );
  assert.deepEqual(getRapidRedemptionWhere(input, now), {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "staff-1",
    type: "REDEEM",
    amount: -5,
    createdAt: {
      gte: new Date("2026-07-20T11:59:55.000Z"),
    },
  });
});

test("scopes duplicate earn detection to the tenant, customer, actor, and amount", () => {
  const input = {
    businessId: "business-1",
    customerId: "customer-1",
    createdById: "staff-1",
    amount: 2,
  };
  const now = new Date("2026-07-20T12:00:00.000Z");

  assert.equal(
    getRapidEarnRateLimitKey(input),
    "loyalty-earn:business-1:customer-1:staff-1:2"
  );
  assert.deepEqual(getRapidEarnWhere(input, now), {
    customerId: "customer-1",
    businessId: "business-1",
    createdById: "staff-1",
    type: "EARN",
    amount: 2,
    createdAt: {
      gte: new Date("2026-07-20T11:59:55.000Z"),
    },
  });
});
