import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getRetentionPresentation, calculateRetentionScore } from "@/lib/customers/retention-score";
import { balanceLabel, earnActionLabel, formatLoyaltyAmount, formatLoyaltyNumber, loyaltyAmountParts, operationalUnitLabel } from "@/lib/loyalty/presentation";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("canonical visit presentation describes configured credit in Arabic and English", () => {
  assert.equal(earnActionLabel({ loyaltyMode: "VISITS", language: "EN", unitName: "visits", earnAmount: 1 }), "Record visit");
  assert.equal(earnActionLabel({ loyaltyMode: "VISITS", language: "EN", unitName: "visits", earnAmount: 3 }), "Record visit — adds 3 visits");
  assert.equal(earnActionLabel({ loyaltyMode: "VISITS", language: "AR", unitName: "زيارة", earnAmount: 3 }), "تسجيل زيارة — قيمة الإضافة: ٣ زيارة");
});

test("points retain a configured operational label", () => {
  assert.equal(operationalUnitLabel({ loyaltyMode: "POINTS", language: "EN", unitName: "Stars" }), "Stars");
  assert.equal(formatLoyaltyAmount({ loyaltyMode: "POINTS", language: "AR", unitName: "نقطة", amount: 12 }), "١٢ نقطة");
});

test("configured English units share one singular and plural presentation authority", () => {
  const input = { loyaltyMode: "POINTS", language: "EN", unitName: "Recommendations" } as const;
  assert.equal(formatLoyaltyAmount({ ...input, amount: 1 }), "1 Recommendation");
  assert.equal(formatLoyaltyAmount({ ...input, amount: 3 }), "3 Recommendations");
  assert.equal(
    formatLoyaltyAmount({ ...input, unitName: "VIP Visits", amount: 1 }),
    "1 VIP Visit",
  );
  assert.deepEqual(loyaltyAmountParts({ ...input, amount: 1 }), {
    amount: "1",
    unit: "Recommendation",
    currencyFirst: false,
  });
  assert.equal(balanceLabel(input), "Loyalty balance");
  assert.equal(earnActionLabel({ ...input, earnAmount: 1 }), "Add 1 Recommendation");
});

test("long loyalty units render as indivisible responsive labels", () => {
  const display = source("components/loyalty-amount-display.tsx");
  const customer = source("app/businesses/[slug]/customers/[customerId]/page.tsx");
  const programme = source("app/businesses/[slug]/program/page.tsx");
  const join = source("app/join/[slug]/page.tsx");

  assert.match(display, /data-loyalty-amount-display/);
  assert.match(display, /overflow-wrap:normal/);
  assert.match(display, /word-break:normal/);
  assert.match(customer, /loyaltyBalanceLabel/);
  assert.match(customer, /loyaltyEarnLabel/);
  assert.doesNotMatch(customer, /copy\.pointsBalance|copy\.addPoints/);
  assert.doesNotMatch(programme, /className="mt-1 truncate/);
  assert.match(programme, /overflow-wrap:normal/);
  assert.match(join, /overflow-wrap:normal/);
});

test("sales presentation uses whole-number business currency instead of unitName", () => {
  assert.equal(formatLoyaltyAmount({ loyaltyMode: "SALES_AMOUNT", language: "EN", unitName: "credits", currency: "SAR", amount: 1250 }), "SAR 1,250");
  assert.equal(formatLoyaltyAmount({ loyaltyMode: "SALES_AMOUNT", language: "AR", unitName: "نقاط", currency: null, amount: 1250 }), "EGP ١٬٢٥٠");
});

test("new customer retention presentation preserves score but suppresses at-risk wording", () => {
  const score = calculateRetentionScore({ now: new Date("2026-07-20T12:00:00Z"), createdAt: new Date("2026-07-19T12:00:00Z"), lastActivityAt: null, transactionCount: 0, lifetimeEarned: 0, lifetimeRedeemed: 0, balance: 0, loyaltyMode: "VISITS", earnAmount: 1, rewardThreshold: 5 });
  assert.equal(score.label, "At Risk");
  assert.deepEqual(getRetentionPresentation({ createdAt: new Date("2026-07-19T12:00:00Z"), score, now: new Date("2026-07-20T12:00:00Z") }), { ...score, label: "NEW" });
  assert.equal(getRetentionPresentation({ createdAt: new Date("2026-06-01T12:00:00Z"), score, now: new Date("2026-07-20T12:00:00Z") }).label, "At Risk");
  assert.equal(getRetentionPresentation({ createdAt: new Date("2026-07-21T12:00:00Z"), score, now: new Date("2026-07-20T12:00:00Z") }).label, "At Risk");
});

test("CSV values stay localized numeric cells while the unit remains a separate canonical field", () => {
  assert.equal(formatLoyaltyNumber(1250, "AR"), "١٬٢٥٠");
  assert.equal(operationalUnitLabel({ loyaltyMode: "SALES_AMOUNT", language: "AR", unitName: "credits", currency: null }), "EGP");
  const exportSource = source("app/businesses/[slug]/reports/export/route.ts");
  assert.match(exportSource, /formatLoyaltyNumber\(transaction\.amount, "AR"\)/);
  assert.match(exportSource, /operationalUnitLabel\(\{ loyaltyMode: business\.loyaltyMode/);
  assert.doesNotMatch(exportSource, /formatLoyaltyAmount/);
});

test("staff, report, export, and card surfaces use the centralized presentation rules", () => {
  for (const file of ["app/businesses/[slug]/customers/page.tsx", "app/businesses/[slug]/customers/[customerId]/page.tsx", "app/businesses/[slug]/scan/customer/[customerId]/page.tsx", "app/businesses/[slug]/reports/page.tsx"]) {
    assert.match(source(file), /formatLoyaltyAmount/);
  }
  const exportSource = source("app/businesses/[slug]/reports/export/route.ts");
  assert.match(exportSource, /formatLoyaltyNumber/);
  assert.match(exportSource, /operationalUnitLabel/);
  assert.match(source("components/program-rules-form.tsx"), /fallbackRewardHelp/);
  assert.match(source("lib/cards/standard-card.ts"), /loyaltyCurrency/);
});
