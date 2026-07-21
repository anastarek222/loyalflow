import assert from "node:assert/strict";
import test from "node:test";

import { calculateRetentionScore } from "../lib/customers/retention-score";

const now = new Date("2026-07-20T12:00:00.000Z");

function getScore(overrides: Partial<Parameters<typeof calculateRetentionScore>[0]> = {}) {
  return calculateRetentionScore({
    now,
    createdAt: new Date("2026-01-01T12:00:00.000Z"),
    lastActivityAt: new Date("2026-07-19T12:00:00.000Z"),
    transactionCount: 10,
    lifetimeEarned: 100,
    lifetimeRedeemed: 15,
    balance: 5,
    loyaltyMode: "VISITS",
    earnAmount: 1,
    rewardThreshold: 5,
    ...overrides,
  });
}

test("scores an engaged recent customer as very loyal", () => {
  assert.deepEqual(getScore(), {
    score: 100,
    label: "Very Loyal",
  });
});

test("uses documented score boundaries", () => {
  assert.equal(getScore({
    lastActivityAt: new Date("2026-06-25T12:00:00.000Z"),
    transactionCount: 5,
    lifetimeEarned: 5,
    lifetimeRedeemed: 0,
    balance: 0,
  }).label, "At Risk");

  assert.equal(getScore({
    lastActivityAt: new Date("2026-04-01T12:00:00.000Z"),
    transactionCount: 0,
    lifetimeEarned: 0,
    lifetimeRedeemed: 0,
    balance: 0,
  }).label, "High Risk / Inactive");
});

test("handles sales programmes using their tracked value", () => {
  const score = getScore({
    loyaltyMode: "SALES_AMOUNT",
    rewardThreshold: 100,
    lifetimeEarned: 1_000,
    lifetimeRedeemed: 300,
    balance: 100,
  });

  assert.equal(score.score, 100);
  assert.equal(score.label, "Very Loyal");
});
