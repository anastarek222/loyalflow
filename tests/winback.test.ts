import assert from "node:assert/strict";
import test from "node:test";

import {
  getWinBackAudienceWhere,
  getWinBackMessage,
} from "@/lib/campaigns/winback";

test("uses the existing deterministic inactive segmentation for a win-back audience", () => {
  const now = new Date("2026-07-20T00:00:00.000Z");
  const where = getWinBackAudienceWhere("INACTIVE", {
    rewardThreshold: 5,
    earnAmount: 1,
    now,
  });

  assert.deepEqual(where, {
    OR: [
      { isActive: false },
      {
        isActive: true,
        createdAt: { lt: new Date("2026-06-20T00:00:00.000Z") },
        lifetimeEarned: { lt: 25 },
        transactions: { none: { createdAt: { gte: new Date("2026-05-21T00:00:00.000Z") } } },
      },
    ],
  });
});

test("renders a staff-reviewed win-back message without sending it", () => {
  const message = getWinBackMessage({
    customer: "Mona",
    business: "Loyal Cafe",
    balance: 3,
    unit: "visits",
    reward: "coffee",
    cardLink: "https://app.example.com/card/token",
    remaining: 2,
    loyaltyMode: "VISITS",
    template: "Hello {customer}, {balance} {unit}: {card_link}",
  });

  assert.equal(
    message,
    "Hello Mona, 3 visits: https://app.example.com/card/token"
  );
});
