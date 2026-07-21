import assert from "node:assert/strict";
import test from "node:test";

import { normalizeOfferInput, offerInputSchema } from "../lib/offers/catalog";
import { isOfferEligible } from "../lib/offers/eligibility";

const now = new Date("2026-07-20T12:00:00.000Z");
const business = { id: "business-a", rewardThreshold: 5 };
const activeCustomer = {
  businessId: "business-a",
  isActive: true,
  createdAt: new Date("2026-05-01T12:00:00.000Z"),
  lifetimeEarned: 2,
  lastActivityAt: new Date("2026-07-15T12:00:00.000Z"),
};

function offer(overrides: Partial<Parameters<typeof isOfferEligible>[0]> = {}) {
  return {
    businessId: "business-a",
    isActive: true,
    validFrom: new Date("2026-07-01T00:00:00.000Z"),
    validUntil: new Date("2026-07-31T23:59:59.999Z"),
    eligibility: "ALL" as const,
    segment: null,
    ...overrides,
  };
}

test("active offers are read-only incentives and respect inclusive date boundaries", () => {
  assert.equal(isOfferEligible(offer(), activeCustomer, business, now), true);
  assert.equal(
    isOfferEligible(offer({ validUntil: now }), activeCustomer, business, now),
    true
  );
  assert.equal(
    isOfferEligible(offer({ validUntil: new Date(now.getTime() - 1) }), activeCustomer, business, now),
    false
  );
});

test("inactive, expired, future, and cross-tenant offers are never eligible", () => {
  assert.equal(isOfferEligible(offer({ isActive: false }), activeCustomer, business, now), false);
  assert.equal(isOfferEligible(offer({ validUntil: new Date("2026-07-19T23:59:59.999Z") }), activeCustomer, business, now), false);
  assert.equal(isOfferEligible(offer({ validFrom: new Date("2026-07-21T00:00:00.000Z") }), activeCustomer, business, now), false);
  assert.equal(isOfferEligible(offer({ businessId: "business-b" }), activeCustomer, business, now), false);
});

test("segment and VIP eligibility reuse the deterministic customer segment engine", () => {
  assert.equal(
    isOfferEligible(offer({ eligibility: "SEGMENT", segment: "ACTIVE" }), activeCustomer, business, now),
    true
  );
  assert.equal(
    isOfferEligible(offer({ eligibility: "SEGMENT", segment: "VIP" }), activeCustomer, business, now),
    false
  );
  const vipCustomer = { ...activeCustomer, lifetimeEarned: 25 };
  assert.equal(isOfferEligible(offer({ eligibility: "VIP" }), vipCustomer, business, now), true);
  assert.equal(isOfferEligible(offer({ eligibility: "VIP" }), activeCustomer, business, now), false);
});

test("offer input uses whole UTC days and rejects invalid audience/date combinations", () => {
  const parsed = offerInputSchema.safeParse({
    name: "Weekend offer",
    description: "A safe preview-only incentive",
    validFrom: "2026-07-20",
    validUntil: "2026-07-21",
    eligibility: "SEGMENT",
    segment: "ACTIVE",
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.deepEqual(normalizeOfferInput(parsed.data).validFrom, new Date("2026-07-20T00:00:00.000Z"));
  assert.deepEqual(normalizeOfferInput(parsed.data).validUntil, new Date("2026-07-21T23:59:59.999Z"));
  assert.equal(offerInputSchema.safeParse({ name: "Broken", eligibility: "SEGMENT" }).success, false);
  assert.equal(offerInputSchema.safeParse({ name: "Broken", eligibility: "ALL", segment: "ACTIVE" }).success, false);
  assert.equal(offerInputSchema.safeParse({ name: "Broken", validFrom: "2026-07-22", validUntil: "2026-07-21", eligibility: "ALL" }).success, false);
});
