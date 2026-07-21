import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePromotionBonus,
  selectEligiblePromotion,
} from "@/lib/promotions/engine";

const now = new Date("2026-07-20T12:00:00.000Z");

function promotion(overrides: Partial<Parameters<typeof selectEligiblePromotion>[0]["promotions"][number]> = {}) {
  return {
    id: "promotion-1",
    businessId: "business-1",
    isActive: true,
    loyaltyMode: null,
    minimumTransactionAmount: null,
    bonusAmount: 2,
    bonusMultiplier: null,
    startsAt: null,
    endsAt: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("selects only an eligible promotion from the current tenant", () => {
  const selected = selectEligiblePromotion({
    businessId: "business-1",
    loyaltyMode: "SALES_AMOUNT",
    transactionAmount: 100,
    occurredAt: now,
    promotions: [
      promotion({ id: "other-business", businessId: "business-2", bonusAmount: 50 }),
      promotion({ id: "wrong-mode", loyaltyMode: "VISITS", bonusAmount: 40 }),
      promotion({ id: "threshold", minimumTransactionAmount: 150, bonusAmount: 30 }),
      promotion({ id: "eligible", loyaltyMode: "SALES_AMOUNT", bonusAmount: 5 }),
    ],
  });

  assert.equal(selected?.id, "eligible");
});

test("returns no promotion when no rule matches", () => {
  assert.equal(
    selectEligiblePromotion({
      businessId: "business-1",
      loyaltyMode: "VISITS",
      transactionAmount: 1,
      occurredAt: now,
      promotions: [promotion({ loyaltyMode: "SALES_AMOUNT" })],
    }),
    null
  );
});

test("uses a deterministic highest-bonus, oldest-rule, then id tie break", () => {
  const selected = selectEligiblePromotion({
    businessId: "business-1",
    loyaltyMode: "VISITS",
    transactionAmount: 1,
    occurredAt: now,
    promotions: [
      promotion({ id: "z", bonusAmount: 5, createdAt: new Date("2026-07-02T00:00:00Z") }),
      promotion({ id: "b", bonusAmount: 5, createdAt: new Date("2026-07-01T00:00:00Z") }),
      promotion({ id: "a", bonusAmount: 5, createdAt: new Date("2026-07-01T00:00:00Z") }),
    ],
  });

  assert.equal(selected?.id, "a");
});

test("rejects inactive, expired, and invalid transaction amounts", () => {
  assert.equal(
    selectEligiblePromotion({
      businessId: "business-1",
      loyaltyMode: "POINTS",
      transactionAmount: 0,
      occurredAt: now,
      promotions: [promotion()],
    }),
    null
  );
  assert.equal(
    selectEligiblePromotion({
      businessId: "business-1",
      loyaltyMode: "POINTS",
      transactionAmount: 1,
      occurredAt: now,
      promotions: [promotion({ isActive: false }), promotion({ id: "expired", endsAt: new Date("2026-07-19T00:00:00Z") })],
    }),
    null
  );
});

test("calculates fixed and multiplier bonuses from the base earning amount", () => {
  assert.equal(
    calculatePromotionBonus(
      promotion({ bonusAmount: 3, bonusMultiplier: 3 }),
      4
    ),
    11
  );
  assert.equal(
    calculatePromotionBonus(
      promotion({ bonusAmount: 3, bonusMultiplier: 1 }),
      4
    ),
    3
  );
});

test("uses the selected multiplier rule's computed bonus for the final credit", () => {
  const selected = selectEligiblePromotion({
    businessId: "business-1",
    loyaltyMode: "VISITS",
    transactionAmount: 2,
    occurredAt: now,
    promotions: [
      promotion({ id: "fixed", bonusAmount: 2 }),
      promotion({
        id: "multiplier",
        bonusAmount: 1,
        bonusMultiplier: 3,
      }),
    ],
  });

  assert.equal(selected?.id, "multiplier");
  assert.equal(calculatePromotionBonus(selected!, 2), 5);
});
