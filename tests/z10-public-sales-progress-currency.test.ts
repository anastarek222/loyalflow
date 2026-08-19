import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../app/card/[token]/page.tsx", import.meta.url),
  "utf8",
);
const panelSource = readFileSync(
  new URL("../components/sales-progress-panel.tsx", import.meta.url),
  "utf8",
);

test("Z10 public Sales Amount progress receives business currency instead of loyalty unit name", () => {
  const panelUsage = pageSource.match(
    /<SalesProgressPanel[\s\S]*?\/>/,
  )?.[0];

  assert.ok(panelUsage);
  assert.match(panelUsage, /currency=\{business\.currency\}/);
  assert.doesNotMatch(panelUsage, /unitName=\{business\.unitName\}/);
});

test("Z10 Sales Amount panel delegates amount formatting to canonical loyalty presentation", () => {
  assert.match(
    panelSource,
    /import \{ formatLoyaltyAmount \} from "@\/lib\/loyalty\/presentation"/,
  );
  assert.match(panelSource, /currency: string \| null/);
  assert.match(
    panelSource,
    /formatLoyaltyAmount\(\{[\s\S]*?loyaltyMode: "SALES_AMOUNT"[\s\S]*?currency,[\s\S]*?amount,/,
  );
  assert.doesNotMatch(panelSource, /`\$\{numberFormatter\.format\(amount\)\} \$\{unitName\}`/);
});

test("Z10 Sales Amount progress keeps reward and progress calculation behavior unchanged", () => {
  assert.match(panelSource, /const safeTarget = Math\.max\(1, targetAmount\)/);
  assert.match(panelSource, /currentAmount >= safeTarget/);
  assert.match(panelSource, /Math\.max\(0, safeTarget - currentAmount\)/);
  assert.match(
    panelSource,
    /Math\.floor\(\(currentAmount \/ safeTarget\) \* 100\)/,
  );
});
