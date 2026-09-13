import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  customerMatchesSegment,
  getCustomerLifecycleSegment,
  getCustomerTraits,
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
