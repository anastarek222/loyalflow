import assert from "node:assert/strict";
import test from "node:test";

import {
  FREQUENT_VISITOR_EARN_EVENTS,
  getHighSpenderNetSalesThreshold,
  resolveCustomerAudienceContext,
} from "../lib/customers/audience-context";

const now = new Date("2026-07-20T12:00:00.000Z");
const base = {
  customerActive: true,
  balance: 5,
  rewardThreshold: 5,
  rewardName: "Free coffee",
  catalogueRewards: [],
  now,
};

test("reward ready is catalogue-aware inside audience context", () => {
  const context = resolveCustomerAudienceContext({
    ...base,
    loyaltyMode: "VISITS",
    balance: 5,
    catalogueRewards: [
      { id: "reward-10", name: "Premium reward", cost: 10, isActive: true },
    ],
    transactions: [],
  });

  assert.equal(context.rewardReady, false);
});

test("high spender uses net recorded sales after refunds and voids", () => {
  const threshold = getHighSpenderNetSalesThreshold(100);
  assert.equal(threshold, 1_000);

  const context = resolveCustomerAudienceContext({
    ...base,
    loyaltyMode: "SALES_AMOUNT",
    rewardThreshold: 100,
    balance: 0,
    transactions: [
      { type: "EARN", amount: 400, saleAmount: 700, createdAt: now, sourceLoyaltyMode: "SALES_AMOUNT" },
      { type: "EARN", amount: 300, saleAmount: 500, createdAt: now, sourceLoyaltyMode: "SALES_AMOUNT" },
      { type: "REVERSAL", amount: -100, saleAmount: 300, reversalKind: "EARN_REFUND", createdAt: now, sourceLoyaltyMode: "SALES_AMOUNT" },
    ],
  });

  assert.equal(context.netQualifyingSales, 900);
  assert.equal(context.highSpenderThreshold, 1_000);
});

test("frequent visitor counts earn operations instead of points or promotion bonus amount", () => {
  const transactions = Array.from({ length: FREQUENT_VISITOR_EARN_EVENTS }, (_, index) => ({
    type: "EARN" as const,
    amount: index === 0 ? 10_000 : 1,
    saleAmount: null,
    createdAt: new Date(`2026-07-${String(10 + index).padStart(2, "0")}T12:00:00.000Z`),
    sourceLoyaltyMode: "VISITS" as const,
  }));

  const context = resolveCustomerAudienceContext({
    ...base,
    loyaltyMode: "VISITS",
    transactions,
  });

  assert.equal(context.qualifyingVisitCount, FREQUENT_VISITOR_EARN_EVENTS);
  assert.equal(context.frequentVisitorThreshold, FREQUENT_VISITOR_EARN_EVENTS);
});

test("frequent visitor ignores stale and different-mode earn events", () => {
  const context = resolveCustomerAudienceContext({
    ...base,
    loyaltyMode: "VISITS",
    transactions: [
      { type: "EARN", amount: 1, saleAmount: null, createdAt: new Date("2026-06-01T12:00:00.000Z"), sourceLoyaltyMode: "VISITS" },
      { type: "EARN", amount: 1, saleAmount: null, createdAt: new Date("2026-07-15T12:00:00.000Z"), sourceLoyaltyMode: "POINTS" },
      { type: "EARN", amount: 1, saleAmount: null, createdAt: new Date("2026-07-16T12:00:00.000Z"), sourceLoyaltyMode: "VISITS" },
    ],
  });

  assert.equal(context.qualifyingVisitCount, 1);
});
