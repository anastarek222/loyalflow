import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  isBusinessCurrencyChange,
  isHistoricalSalesAmountCurrencyChangeBlocked,
} from "@/lib/business/currency-change-safety";
import { SUPPORTED_CURRENCY_CODES } from "@/lib/onboarding/countries";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("currency changes remain allowed before Sales Amount history exists", () => {
  assert.equal(isBusinessCurrencyChange("EGP", "USD"), true);
  assert.equal(
    isHistoricalSalesAmountCurrencyChangeBlocked({
      currentCurrency: "EGP",
      proposedCurrency: "USD",
      hasHistoricalSalesAmount: false,
    }),
    false,
  );
});

test("historical Sales Amount transactions lock the business currency label", () => {
  assert.equal(
    isHistoricalSalesAmountCurrencyChangeBlocked({
      currentCurrency: "EGP",
      proposedCurrency: "USD",
      hasHistoricalSalesAmount: true,
    }),
    true,
  );
  assert.equal(
    isHistoricalSalesAmountCurrencyChangeBlocked({
      currentCurrency: "egp",
      proposedCurrency: " EGP ",
      hasHistoricalSalesAmount: true,
    }),
    false,
  );
});

test("Business Settings write boundary checks Sales Amount history before changing currency", () => {
  const command = source("lib/server/business/settings-command.ts");
  assert.match(command, /sourceLoyaltyMode: "SALES_AMOUNT"/);
  assert.match(command, /saleAmount: \{ not: null \}/);
  assert.match(command, /reason: "CURRENCY_LOCKED"/);
  assert.match(command, /isHistoricalSalesAmountCurrencyChangeBlocked/);
});

test("Business Profile currency options use the shared supported currency catalog", () => {
  const form = source("components/business-settings-form.tsx");

  assert.match(form, /SUPPORTED_CURRENCY_CODES/);
  assert.match(form, /SUPPORTED_CURRENCY_CODES\.map\(\(currency\) =>/);
  assert.doesNotMatch(
    form,
    /\["AED", "EGP", "EUR", "GBP", "KWD", "QAR", "SAR", "USD"\]/,
  );
  assert.ok(SUPPORTED_CURRENCY_CODES.includes("EGP"));
  assert.ok(SUPPORTED_CURRENCY_CODES.includes("USD"));
});
