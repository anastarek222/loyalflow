import assert from "node:assert/strict";
import test from "node:test";

import {
  isBusinessCurrencyChange,
  isHistoricalSalesAmountCurrencyChangeBlocked,
  normalizeBusinessCurrency,
} from "../lib/business/currency-change-safety";

test("business currency comparison is normalized", () => {
  assert.equal(normalizeBusinessCurrency(" egp "), "EGP");
  assert.equal(isBusinessCurrencyChange("egp", " EGP "), false);
  assert.equal(isBusinessCurrencyChange("EGP", "USD"), true);
});

test("same currency remains allowed even when sales amount history exists", () => {
  assert.equal(
    isHistoricalSalesAmountCurrencyChangeBlocked({
      currentCurrency: "EGP",
      proposedCurrency: "EGP",
      hasHistoricalSalesAmount: true,
    }),
    false,
  );
});

test("currency can change before sales amount financial history exists", () => {
  assert.equal(
    isHistoricalSalesAmountCurrencyChangeBlocked({
      currentCurrency: "EGP",
      proposedCurrency: "USD",
      hasHistoricalSalesAmount: false,
    }),
    false,
  );
});

test("currency change is blocked after sales amount financial history exists", () => {
  assert.equal(
    isHistoricalSalesAmountCurrencyChangeBlocked({
      currentCurrency: "EGP",
      proposedCurrency: "USD",
      hasHistoricalSalesAmount: true,
    }),
    true,
  );
});
