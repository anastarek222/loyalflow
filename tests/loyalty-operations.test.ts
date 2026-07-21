import assert from "node:assert/strict";
import test from "node:test";

import {
  getEarnDetails,
  getRewardLabel,
} from "../lib/loyalty/operations";

test("uses the configured amount for visits and points", () => {
  for (const loyaltyMode of ["VISITS", "POINTS"] as const) {
    assert.deepEqual(
      getEarnDetails({
        loyaltyMode,
        earnAmount: 2,
        unitName: "points",
      }),
      {
        amount: 2,
        transactionNote: "Loyalty credit added",
        activityDescription: "Added 2 loyalty credit",
      }
    );
  }
});

test("uses the recorded sale amount for sales-based loyalty", () => {
  assert.deepEqual(
    getEarnDetails({
      loyaltyMode: "SALES_AMOUNT",
      earnAmount: 1,
      saleAmount: 250,
      unitName: "EGP",
    }),
    {
      amount: 250,
      transactionNote: "Sale recorded: 250 EGP",
      activityDescription: "Recorded sale amount 250 EGP",
    }
  );
});

test("rejects missing or fractional loyalty amounts", () => {
  assert.throws(
    () =>
      getEarnDetails({
        loyaltyMode: "SALES_AMOUNT",
        earnAmount: 1,
        unitName: "EGP",
      }),
    /positive whole-number/
  );

  assert.throws(
    () =>
      getEarnDetails({
        loyaltyMode: "POINTS",
        earnAmount: 1.5,
        unitName: "point",
      }),
    /positive whole-number/
  );
});

test("adds promo codes to the redemption label only when configured", () => {
  assert.equal(
    getRewardLabel("PROMO_CODE", "20% off", "VIP20"),
    "20% off — VIP20"
  );
  assert.equal(
    getRewardLabel("PROMO_CODE", "20% off", null),
    "20% off"
  );
  assert.equal(
    getRewardLabel("GIFT", "Free coffee", "IGNORED"),
    "Free coffee"
  );
});
