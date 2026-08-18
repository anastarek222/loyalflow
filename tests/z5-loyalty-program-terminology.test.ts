import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  loyaltyProgrammeFieldHelp,
  loyaltyProgrammeSummary,
} from "../lib/loyalty/presentation.ts";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z5 keeps Visits and Points earn values in their configured operational unit", () => {
  assert.deepEqual(
    loyaltyProgrammeSummary({
      loyaltyMode: "VISITS",
      language: "EN",
      unitName: "stamps",
      currency: "CHF",
      earnAmount: 2,
      rewardThreshold: 10,
    }),
    { mode: "Visits", earn: "2 stamps", target: "10 stamps" },
  );

  assert.deepEqual(
    loyaltyProgrammeSummary({
      loyaltyMode: "POINTS",
      language: "EN",
      unitName: "points",
      currency: "CHF",
      earnAmount: 5,
      rewardThreshold: 100,
    }),
    { mode: "Points", earn: "5 points", target: "100 points" },
  );
});

test("Z5 Sales Amount summary uses recorded sale value and business currency", () => {
  assert.deepEqual(
    loyaltyProgrammeSummary({
      loyaltyMode: "SALES_AMOUNT",
      language: "EN",
      unitName: "points",
      currency: "CHF",
      earnAmount: 99,
      rewardThreshold: 500,
    }),
    {
      mode: "Sales amount",
      earn: "Recorded sale amount",
      target: "CHF 500",
    },
  );
});

test("Z5 field guidance keeps the six programme concepts semantically distinct", () => {
  const help = loyaltyProgrammeFieldHelp("SALES_AMOUNT", "EN");

  assert.match(help.loyaltyProgramName, /Administrative programme name/);
  assert.match(help.loyaltyMode, /balance source/);
  assert.match(help.unitName, /business currency/);
  assert.match(help.earnAmount, /recorded sale amount/);
  assert.match(help.rewardThreshold, /Fallback reward target/);
  assert.match(help.rewardName, /Fallback reward name/);
});

test("Z5 Program presentation consumes the centralized terminology without changing writers", () => {
  const page = source("app/businesses/[slug]/program/page.tsx");
  const form = source("components/program-rules-form.tsx");

  assert.match(page, /loyaltyProgrammeSummary/);
  assert.match(page, /value=\{programSummary\.earn\}/);
  assert.match(page, /value=\{programSummary\.target\}/);
  assert.doesNotMatch(page, /value=\{`\$\{business\.earnAmount\} \$\{business\.unitName\}`\}/);

  assert.match(form, /loyaltyProgrammeFieldHelp/);
  assert.match(form, /fieldHelp\.loyaltyMode/);
  assert.match(form, /name="earnAmount"|"earnAmount"/);
  assert.match(form, /name="rewardThreshold"|"rewardThreshold"/);
  assert.match(form, /action=\{action\}/);
  assert.match(form, /getLoyaltyEconomicRuleChanges/);
});
