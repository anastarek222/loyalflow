import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { formatLoyaltyAmount } from "../lib/loyalty/presentation";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z10 keeps customer loyalty amount formatting mode-aware", () => {
  assert.equal(
    formatLoyaltyAmount({
      loyaltyMode: "SALES_AMOUNT",
      language: "EN",
      unitName: "points",
      currency: "CHF",
      amount: 500,
    }),
    "CHF 500",
  );

  assert.equal(
    formatLoyaltyAmount({
      loyaltyMode: "POINTS",
      language: "EN",
      unitName: "points",
      currency: "CHF",
      amount: 500,
    }),
    "500 points",
  );
});

test("Z10 Join summary uses the centralized loyalty formatter and business currency authority", () => {
  const joinPage = source("app/join/[slug]/page.tsx");

  assert.match(joinPage, /formatLoyaltyAmount/);
  assert.match(joinPage, /loyaltyMode:\s*business\.loyaltyMode/);
  assert.match(joinPage, /unitName:\s*business\.unitName/);
  assert.match(joinPage, /currency:\s*business\.currency/);
  assert.match(joinPage, /amount:\s*business\.rewardThreshold/);
  assert.match(joinPage, /\{copy\.reward\}\s+\{rewardTarget\}/);
  assert.doesNotMatch(
    joinPage,
    /\{business\.rewardThreshold\}\s+\{business\.unitName\}/,
  );
});

test("Z10 Sales progress receives business currency and formats all monetary progress values through Z5 authority", () => {
  const cardPage = source("app/card/[token]/page.tsx");
  const progressPanel = source("components/sales-progress-panel.tsx");

  assert.match(
    cardPage,
    /<SalesProgressPanel[\s\S]*?currency=\{business\.currency\}/,
  );
  assert.doesNotMatch(
    cardPage,
    /<SalesProgressPanel[\s\S]*?unitName=\{business\.unitName\}/,
  );

  assert.match(progressPanel, /currency:\s*string \| null/);
  assert.match(progressPanel, /formatLoyaltyAmount/);
  assert.match(progressPanel, /loyaltyMode:\s*"SALES_AMOUNT"/);
  assert.match(progressPanel, /currency,/);
  assert.doesNotMatch(progressPanel, /numberFormatter/);
});
