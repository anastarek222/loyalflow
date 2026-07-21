import assert from "node:assert/strict";
import test from "node:test";

import {
  getCustomerFilterSegments,
  getCustomerSegment,
  getCustomerSegmentWhere,
} from "../lib/customers/segments";

const now = new Date("2026-07-20T12:00:00.000Z");

function getSegment(overrides: Partial<Parameters<typeof getCustomerSegment>[0]>) {
  return getCustomerSegment(
    {
      isActive: true,
      createdAt: new Date("2026-04-01T12:00:00.000Z"),
      lastActivityAt: new Date("2026-07-15T12:00:00.000Z"),
      lifetimeEarned: 0,
      rewardThreshold: 5,
      ...overrides,
    },
    now
  );
}

test("assigns one deterministic segment using documented priority", () => {
  assert.equal(
    getSegment({
      createdAt: new Date("2026-07-01T12:00:00.000Z"),
      lifetimeEarned: 100,
    }),
    "NEW"
  );
  assert.equal(getSegment({ lifetimeEarned: 25 }), "VIP");
  assert.equal(getSegment({}), "ACTIVE");
  assert.equal(
    getSegment({
      lastActivityAt: new Date("2026-06-10T12:00:00.000Z"),
    }),
    "AT_RISK"
  );
  assert.equal(
    getSegment({
      lastActivityAt: new Date("2026-05-01T12:00:00.000Z"),
    }),
    "INACTIVE"
  );
  assert.equal(getSegment({ isActive: false }), "INACTIVE");
});

test("keeps advanced segment filters deterministic and programme-aware", () => {
  assert.deepEqual(
    getCustomerFilterSegments("SALES_AMOUNT"),
    [
      "NEW",
      "ACTIVE",
      "VIP",
      "AT_RISK",
      "INACTIVE",
      "REWARD_READY",
      "HIGH_SPENDER",
    ]
  );
  assert.deepEqual(
    getCustomerFilterSegments("VISITS"),
    [
      "NEW",
      "ACTIVE",
      "VIP",
      "AT_RISK",
      "INACTIVE",
      "REWARD_READY",
      "FREQUENT_VISITOR",
    ]
  );
  assert.deepEqual(getCustomerSegmentWhere("REWARD_READY", 5, now), {
    isActive: true,
    balance: { gte: 5 },
  });
  assert.deepEqual(
    getCustomerSegmentWhere("FREQUENT_VISITOR", 5, now, 2),
    {
      isActive: true,
      lifetimeEarned: { gte: 20 },
    }
  );
});

test("builds a transaction-aware filter for the at-risk segment", () => {
  assert.deepEqual(getCustomerSegmentWhere("AT_RISK", 5, now), {
    isActive: true,
    createdAt: {
      lt: new Date("2026-06-20T12:00:00.000Z"),
    },
    lifetimeEarned: {
      lt: 25,
    },
    transactions: {
      none: {
        createdAt: {
          gte: new Date("2026-06-20T12:00:00.000Z"),
        },
      },
      some: {
        createdAt: {
          gte: new Date("2026-05-21T12:00:00.000Z"),
        },
      },
    },
  });
});
