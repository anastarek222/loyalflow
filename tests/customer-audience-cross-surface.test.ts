import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  customerMatchesSegment,
  customerSegments,
  getCustomerLifecycleSegment,
  getCustomerTraits,
  type CustomerSegment,
  type CustomerSegmentContext,
} from "../lib/customers/segments";
import { isOfferEligible } from "../lib/offers/eligibility";

const now = new Date("2026-07-20T12:00:00.000Z");

const business = {
  id: "business-1",
  rewardThreshold: 5,
};

const customer = {
  businessId: business.id,
  isActive: true,
  createdAt: new Date("2026-04-01T12:00:00.000Z"),
  lastActivityAt: new Date("2026-06-10T12:00:00.000Z"),
  lifetimeEarned: 25,
  rewardThreshold: business.rewardThreshold,
};

const audienceContext = {
  rewardReady: true,
};

test("one customer can be at-risk, VIP, and reward-ready across the shared audience predicate", () => {
  assert.equal(getCustomerLifecycleSegment(customer, now), "AT_RISK");
  assert.deepEqual(getCustomerTraits(customer, audienceContext), [
    "VIP",
    "REWARD_READY",
  ]);

  for (const segment of ["AT_RISK", "VIP", "REWARD_READY"] as const) {
    assert.equal(
      customerMatchesSegment(segment, customer, audienceContext, now),
      true,
      `${segment} should remain independently matchable`,
    );
  }
});

test("offer visibility consumes the same independent audience traits", () => {
  for (const segment of ["AT_RISK", "VIP", "REWARD_READY"] as const) {
    assert.equal(
      isOfferEligible(
        {
          businessId: business.id,
          isActive: true,
          validFrom: null,
          validUntil: null,
          eligibility: "SEGMENT",
          segment,
        },
        customer,
        business,
        now,
        audienceContext,
      ),
      true,
      `${segment} offer should use the shared audience truth`,
    );
  }
});

test("customers, reports, and report export resolve selected segments through the server audience authority", () => {
  const surfaces = [
    "../app/businesses/[slug]/customers/page.tsx",
    "../app/businesses/[slug]/reports/page.tsx",
    "../app/businesses/[slug]/reports/export/route.ts",
  ];

  for (const relativePath of surfaces) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.match(
      source,
      /resolveBusinessCustomerIdsForSegment/,
      `${relativePath} must use the authoritative server audience resolver`,
    );
  }
});

test("known ten-customer fixture reconciles every audience with offer eligibility", () => {
  type Fixture = {
    id: string;
    customer: typeof customer;
    context: CustomerSegmentContext;
  };

  const fixtures: Fixture[] = [
    { id: "new-vip", customer: { ...customer, createdAt: new Date("2026-07-01T12:00:00.000Z") }, context: {} },
    { id: "active", customer: { ...customer, lifetimeEarned: 0, lastActivityAt: new Date("2026-07-15T12:00:00.000Z") }, context: {} },
    { id: "at-risk-vip", customer, context: { rewardReady: true } },
    { id: "inactive-lifecycle", customer: { ...customer, lifetimeEarned: 0, lastActivityAt: new Date("2026-04-01T12:00:00.000Z") }, context: {} },
    { id: "inactive-account", customer: { ...customer, isActive: false, lifetimeEarned: 0 }, context: {} },
    { id: "reward-ready", customer: { ...customer, lifetimeEarned: 5 }, context: { rewardReady: true } },
    { id: "high-spender", customer: { ...customer, lifetimeEarned: 0 }, context: { netQualifyingSales: 10_000, highSpenderThreshold: 10_000 } },
    { id: "refunded-below-high", customer: { ...customer, lifetimeEarned: 0 }, context: { netQualifyingSales: 9_999, highSpenderThreshold: 10_000 } },
    { id: "frequent-visitor", customer: { ...customer, lifetimeEarned: 0 }, context: { qualifyingVisitCount: 10, frequentVisitorThreshold: 10 } },
    { id: "below-frequent", customer: { ...customer, lifetimeEarned: 0 }, context: { qualifyingVisitCount: 9, frequentVisitorThreshold: 10 } },
  ];

  const expected: Record<CustomerSegment, string[]> = {
    NEW: ["new-vip"],
    ACTIVE: ["active"],
    VIP: ["new-vip", "at-risk-vip"],
    AT_RISK: ["at-risk-vip", "reward-ready", "high-spender", "refunded-below-high", "frequent-visitor", "below-frequent"],
    INACTIVE: ["inactive-lifecycle", "inactive-account"],
    REWARD_READY: ["at-risk-vip", "reward-ready"],
    HIGH_SPENDER: ["high-spender"],
    FREQUENT_VISITOR: ["frequent-visitor"],
  };
  const expectedOffer = {
    ...expected,
    // Reporting keeps disabled accounts visible; offers always fail closed.
    INACTIVE: ["inactive-lifecycle"],
  } satisfies Record<CustomerSegment, string[]>;

  for (const segment of customerSegments) {
    const filteredIds = fixtures
      .filter(({ customer: fixtureCustomer, context }) =>
        customerMatchesSegment(segment, fixtureCustomer, context, now),
      )
      .map(({ id }) => id);
    const offerIds = fixtures
      .filter(({ customer: fixtureCustomer, context }) =>
        isOfferEligible(
          { businessId: business.id, isActive: true, validFrom: null, validUntil: null, eligibility: "SEGMENT", segment },
          fixtureCustomer,
          business,
          now,
          context,
        ),
      )
      .map(({ id }) => id);

    assert.deepEqual(filteredIds, expected[segment], `${segment} filter fixture`);
    assert.deepEqual(offerIds, expectedOffer[segment], `${segment} offer fixture`);
  }
});
