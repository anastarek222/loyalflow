import assert from "node:assert/strict";
import test from "node:test";

import {
  isOfferCurrentlyValid,
  isOfferEligible,
} from "../lib/offers/eligibility";

const now = new Date("2026-07-20T12:00:00.000Z");

const business = {
  id: "business-1",
  rewardThreshold: 5,
};

const baseOffer = {
  businessId: business.id,
  isActive: true,
  validFrom: null,
  validUntil: null,
  eligibility: "SEGMENT" as const,
  segment: "ACTIVE",
};

const baseCustomer = {
  businessId: business.id,
  isActive: true,
  createdAt: new Date("2026-04-01T12:00:00.000Z"),
  lifetimeEarned: 0,
  lastActivityAt: new Date("2026-07-15T12:00:00.000Z"),
};

test("offer validity keeps inclusive date boundaries", () => {
  assert.equal(
    isOfferCurrentlyValid(
      {
        isActive: true,
        validFrom: now,
        validUntil: now,
      },
      now,
    ),
    true,
  );
  assert.equal(
    isOfferCurrentlyValid(
      {
        isActive: false,
        validFrom: null,
        validUntil: null,
      },
      now,
    ),
    false,
  );
});

test("VIP audience remains eligible while lifecycle is new or at risk", () => {
  const vipOffer = {
    ...baseOffer,
    eligibility: "VIP" as const,
    segment: null,
  };

  assert.equal(
    isOfferEligible(
      vipOffer,
      {
        ...baseCustomer,
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
        lifetimeEarned: 25,
      },
      business,
      now,
    ),
    true,
  );

  assert.equal(
    isOfferEligible(
      vipOffer,
      {
        ...baseCustomer,
        lastActivityAt: new Date("2026-06-10T12:00:00.000Z"),
        lifetimeEarned: 25,
      },
      business,
      now,
    ),
    true,
  );
});

test("segment audiences use independent authoritative trait context", () => {
  const rewardReadyOffer = {
    ...baseOffer,
    segment: "REWARD_READY",
  };
  const highSpenderOffer = {
    ...baseOffer,
    segment: "HIGH_SPENDER",
  };
  const frequentVisitorOffer = {
    ...baseOffer,
    segment: "FREQUENT_VISITOR",
  };

  assert.equal(
    isOfferEligible(rewardReadyOffer, baseCustomer, business, now),
    false,
  );
  assert.equal(
    isOfferEligible(
      rewardReadyOffer,
      baseCustomer,
      business,
      now,
      { rewardReady: true },
    ),
    true,
  );
  assert.equal(
    isOfferEligible(
      highSpenderOffer,
      { ...baseCustomer, lifetimeEarned: 50_000 },
      business,
      now,
      { netQualifyingSales: 9_999, highSpenderThreshold: 10_000 },
    ),
    false,
  );
  assert.equal(
    isOfferEligible(
      highSpenderOffer,
      baseCustomer,
      business,
      now,
      { netQualifyingSales: 10_000, highSpenderThreshold: 10_000 },
    ),
    true,
  );
  assert.equal(
    isOfferEligible(
      frequentVisitorOffer,
      { ...baseCustomer, lifetimeEarned: 50_000 },
      business,
      now,
      { qualifyingVisitCount: 9, frequentVisitorThreshold: 10 },
    ),
    false,
  );
  assert.equal(
    isOfferEligible(
      frequentVisitorOffer,
      baseCustomer,
      business,
      now,
      { qualifyingVisitCount: 10, frequentVisitorThreshold: 10 },
    ),
    true,
  );
});

test("rejects inactive customers, wrong tenants, and unknown segments", () => {
  assert.equal(
    isOfferEligible(baseOffer, { ...baseCustomer, isActive: false }, business, now),
    false,
  );
  assert.equal(
    isOfferEligible(
      baseOffer,
      { ...baseCustomer, businessId: "business-2" },
      business,
      now,
    ),
    false,
  );
  assert.equal(
    isOfferEligible(
      { ...baseOffer, segment: "NOT_A_SEGMENT" },
      baseCustomer,
      business,
      now,
    ),
    false,
  );
});
