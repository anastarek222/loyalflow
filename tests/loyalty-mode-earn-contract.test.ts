import assert from "node:assert/strict";
import test from "node:test";

import { getProgramRulesUpdate, programRulesSettingsSchema } from "../lib/business/settings-domains";
import { getEarnDetails } from "../lib/loyalty/operations";

function programRulesInput(loyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT", earnAmount: number) {
  return programRulesSettingsSchema.parse({
    loyaltyProgramName: "Rewards",
    welcomeMessage: "",
    cardDefaultLanguage: "EN",
    loyaltyMode,
    unitName: loyaltyMode === "VISITS" ? "visits" : loyaltyMode === "POINTS" ? "points" : "EGP",
    rewardName: "Reward",
    rewardType: "GIFT",
    rewardCode: "",
    rewardDescription: "",
    rewardThreshold: 10,
    earnAmount,
  });
}

test("VISITS always earns exactly one visit regardless of stored earnAmount", () => {
  const result = getEarnDetails({
    loyaltyMode: "VISITS",
    earnAmount: 25,
    unitName: "visits",
  });

  assert.equal(result.amount, 1);
  assert.equal(result.transactionNote, "Visit recorded");
});

test("POINTS uses the configured earnAmount", () => {
  const result = getEarnDetails({
    loyaltyMode: "POINTS",
    earnAmount: 7,
    unitName: "points",
  });

  assert.equal(result.amount, 7);
});

test("SALES_AMOUNT earns the recorded whole-unit sale value", () => {
  const result = getEarnDetails({
    loyaltyMode: "SALES_AMOUNT",
    earnAmount: 99,
    saleAmount: 125,
    unitName: "EGP",
  });

  assert.equal(result.amount, 125);
  assert.equal(result.transactionNote, "Sale recorded: 125 EGP");
});

test("SALES_AMOUNT rejects fractional monetary values", () => {
  assert.throws(
    () =>
      getEarnDetails({
        loyaltyMode: "SALES_AMOUNT",
        earnAmount: 1,
        saleAmount: 12.5,
        unitName: "EGP",
      }),
    /positive whole-number loyalty amount/,
  );
});

test("programme settings persist earnAmount only for POINTS", () => {
  assert.equal(getProgramRulesUpdate(programRulesInput("VISITS", 9)).earnAmount, 1);
  assert.equal(getProgramRulesUpdate(programRulesInput("SALES_AMOUNT", 9)).earnAmount, 1);
  assert.equal(getProgramRulesUpdate(programRulesInput("POINTS", 9)).earnAmount, 9);
});
