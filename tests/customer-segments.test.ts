import assert from "node:assert/strict";
import test from "node:test";

import {
  customerMatchesSegment,
  getCustomerFilterSegments,
  getCustomerLifecycleSegment,
  getCustomerSegment,
  getCustomerSegmentWhere,
  getCustomerTraits,
} from "../lib/customers/segments";

const now = new Date("2026-07-20T12:00:00.000Z");

const baseCustomer = {
  isActive: true,
  createdAt: new Date("2026-04-01T12:00:00.000Z"),
  lastActivityAt: new Date("2026-07-15T12:00:00.000Z"),
  lifetimeEarned: 0,
  rewardThreshold: 5,
};

test("separates activity lifecycle from independent customer traits", () => {
  const newVip = {
    ...baseCustomer,
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    lifetimeEarned: 25,
  };

  assert.equal(getCustomerLifecycleSegment(newVip, now), "NEW");
  assert.deepEqual(getCustomerTraits(newVip), ["VIP"]);
  assert.equal(customerMatchesSegment("NEW", newVip, {}, now), true);
  assert.equal(customerMatchesSegment("VIP", newVip, {}, now), true);

  const atRiskVip = {
    ...baseCustomer,
    lastActivityAt: new Date("2026-06-10T12:00:00.000Z"),
    lifetimeEarned: 25,
  };

  assert.equal(getCustomerLifecycleSegment(atRiskVip, now), "AT_RISK");
  assert.equal(customerMatchesSegment("AT_RISK", atRiskVip, {}, now), true);
  assert.equal(customerMatchesSegment("VIP", atRiskVip, {}, now), true);
});

test("requires authoritative context for reward, financial, and visit traits", () => {
  const customer = {
    ...baseCustomer,
    lifetimeEarned: 1_000,
  };

  assert.deepEqual(getCustomerTraits(customer), ["VIP"]);
  assert.equal(customerMatchesSegment("HIGH_SPENDER", customer, {}, now), false);
  assert.equal(customerMatchesSegment("FREQUENT_VISITOR", customer, {}, now), false);
  assert.equal(customerMatchesSegment("REWARD_READY", customer, {}, now), false);

  const context = {
    rewardReady: true,
    netQualifyingSales: 12_000,
    highSpenderThreshold: 10_000,
    qualifyingVisitCount: 12,
    frequentVisitorThreshold: 10,
  };

  assert.deepEqual(getCustomerTraits(customer, context), [
    "VIP",
    "REWARD_READY",
    "HIGH_SPENDER",
    "FREQUENT_VISITOR",
  ]);
});

test("keeps the legacy primary badge deterministic while audience truth is dimensioned", () => {
  assert.equal(
    getCustomerSegment(
      {
        ...baseCustomer,
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
        lifetimeEarned: 100,
      },
      now,
    ),
    "NEW",
  );
  assert.equal(
    getCustomerSegment({ ...baseCustomer, lifetimeEarned: 25 }, now),
    "VIP",
  );
  assert.equal(getCustomerSegment(baseCustomer, now), "ACTIVE");
  assert.equal(
    getCustomerSegment(
      {
        ...baseCustomer,
        lastActivityAt: new Date("2026-05-01T12:00:00.000Z"),
      },
      now,
    ),
    "INACTIVE",
  );
});

test("keeps programme-aware filter choices during consumer migration", () => {
  assert.deepEqual(getCustomerFilterSegments("SALES_AMOUNT"), [
    "NEW",
    "ACTIVE",
    "VIP",
    "AT_RISK",
    "INACTIVE",
    "REWARD_READY",
    "HIGH_SPENDER",
  ]);
  assert.deepEqual(getCustomerFilterSegments("VISITS"), [
    "NEW",
    "ACTIVE",
    "VIP",
    "AT_RISK",
    "INACTIVE",
    "REWARD_READY",
    "FREQUENT_VISITOR",
  ]);
});

test("removes VIP exclusion from lifecycle Prisma filters", () => {
  assert.deepEqual(getCustomerSegmentWhere("AT_RISK", 5, now), {
    isActive: true,
    createdAt: {
      lt: new Date("2026-06-20T12:00:00.000Z"),
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

  assert.deepEqual(getCustomerSegmentWhere("VIP", 5, now), {
    isActive: true,
    lifetimeEarned: { gte: 25 },
  });
});
