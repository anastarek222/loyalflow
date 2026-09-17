import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { getEarnDetails } from "../lib/loyalty/operations";
import { loyaltyCurrency } from "../lib/loyalty/presentation";
import { calculatePromotionBonus } from "../lib/promotions/engine";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const transactions = source("lib/loyalty/transactions.ts");
const reportPage = source("app/businesses/[slug]/reports/page.tsx");
const exportRoute = source("app/businesses/[slug]/reports/export/route.ts");
const currencySafety = source("lib/business/currency-change-safety.ts");

test("sales amount preserves recorded sale separately from promotional loyalty credit", () => {
  const sale = getEarnDetails({
    loyaltyMode: "SALES_AMOUNT",
    earnAmount: 1,
    saleAmount: 100,
    unitName: "EGP",
  });
  const promotionBonus = calculatePromotionBonus(
    { bonusAmount: 0, bonusMultiplier: 2 },
    sale.amount,
  );

  assert.equal(sale.amount, 100);
  assert.equal(promotionBonus, 100);
  assert.equal(sale.amount + promotionBonus, 200);

  assert.match(transactions, /const creditedAmount = input\.amount \+ promotionBonus/);
  assert.match(transactions, /amount: creditedAmount/);
  assert.match(transactions, /saleAmount: input\.saleAmount/);
});

test("reports aggregate actual recorded sales from saleAmount", () => {
  assert.match(reportPage, /\.\.\.getRecordedSalesWhere\(\)/);
  assert.match(reportPage, /_sum: \{\s*saleAmount: true,?\s*\}/);
  assert.match(reportPage, /_avg: \{\s*saleAmount: true,?\s*\}/);
});

test("CSV export exposes loyalty movement and recorded-sale truth as separate fields", () => {
  assert.match(exportRoute, /amount: true,/);
  assert.match(exportRoute, /saleAmount: true,/);

  assert.match(exportRoute, /"قيمة حركة الولاء"/);
  assert.match(exportRoute, /"وحدة حركة الولاء"/);
  assert.match(exportRoute, /"قيمة البيع المسجلة"/);
  assert.match(exportRoute, /"عملة البيع المسجلة"/);

  assert.match(
    exportRoute,
    /transaction\.saleAmount === null\s*\? ""\s*:\s*formatLoyaltyNumber\(transaction\.saleAmount, "AR"\)/,
  );
  assert.match(
    exportRoute,
    /transaction\.saleAmount === null \? "" : loyaltyCurrency\(business\.currency\)/,
  );
});

test("recorded-sale currency uses the canonical fallback and stays locked after sales history", () => {
  assert.equal(loyaltyCurrency(null), "EGP");
  assert.equal(loyaltyCurrency(" egp "), "EGP");
  assert.match(
    currencySafety,
    /input\.hasHistoricalSalesAmount &&\s*isBusinessCurrencyChange\(/,
  );
});

test("export retains tenant and authorization boundaries while exposing sales fields", () => {
  assert.match(exportRoute, /canExportBusinessData\(/);
  assert.match(exportRoute, /hasFeatureEntitlement\(business\.plan, "REPORTING"\)/);
  assert.match(exportRoute, /businessId: business\.id/);
  assert.match(exportRoute, /resolveReportScope\(\{/);
  assert.match(exportRoute, /Spreadsheet Formula Injection/);
});
