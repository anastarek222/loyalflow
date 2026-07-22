import assert from "node:assert/strict";
import test from "node:test";

import {
  createDashboardCustomerGrowth,
  createDashboardLoyaltyGrowth,
  createDashboardRewardStats,
} from "../lib/analytics/dashboard";

test("aggregates loyalty growth by day and makes redeemed values positive", () => {
  assert.deepEqual(
    createDashboardLoyaltyGrowth([
      {
        type: "EARN",
        amount: 3,
        createdAt: new Date("2026-07-01T08:00:00.000Z"),
      },
      {
        type: "EARN",
        amount: 2,
        createdAt: new Date("2026-07-01T14:00:00.000Z"),
      },
      {
        type: "REDEEM",
        amount: -4,
        createdAt: new Date("2026-07-01T19:00:00.000Z"),
      },
      {
        type: "EARN",
        amount: 5,
        createdAt: new Date("2026-07-02T10:00:00.000Z"),
      },
    ]),
    [
      {
        date: "07-01",
        earned: 5,
        redeemed: 4,
      },
      {
        date: "07-02",
        earned: 5,
        redeemed: 0,
      },
    ]
  );
});

test("aggregates multiple customers created on the same day", () => {
  assert.deepEqual(
    createDashboardCustomerGrowth([
      {
        createdAt: new Date("2026-07-01T08:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-07-01T18:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-07-03T12:00:00.000Z"),
      },
    ]),
    [
      {
        date: "07-01",
        customers: 2,
      },
      {
        date: "07-03",
        customers: 1,
      },
    ]
  );
});

test("aggregates and sorts reward redemption statistics", () => {
  assert.deepEqual(
    createDashboardRewardStats([
      { rewardName: "Free Coffee" },
      { rewardName: "Discount 10%" },
      { rewardName: "Free Coffee" },
      { rewardName: "Free Coffee" },
      { rewardName: "Discount 10%" },
    ]),
    [
      {
        name: "Free Coffee",
        redeemed: 3,
      },
      {
        name: "Discount 10%",
        redeemed: 2,
      },
    ]
  );
});

test("returns empty analytics arrays when there is no data", () => {
  assert.deepEqual(
    createDashboardLoyaltyGrowth([]),
    []
  );

  assert.deepEqual(
    createDashboardCustomerGrowth([]),
    []
  );

  assert.deepEqual(
    createDashboardRewardStats([]),
    []
  );
});
