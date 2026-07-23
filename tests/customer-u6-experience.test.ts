import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getCustomerSegmentWhere } from "../lib/customers/segments";
import { getCustomerSegmentLabel } from "../lib/customers/segments";
import { customerUiCopy, getLoyaltyModeLabel } from "../lib/customers/ui-copy";
import { getLanguageDirection } from "../lib/i18n";
import { canPerform } from "../lib/permissions";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const list = source("app/businesses/[slug]/customers/page.tsx");
const detail = source("app/businesses/[slug]/customers/[customerId]/page.tsx");

test("U6 customer list keeps every query tenant scoped and paginated", () => {
  assert.match(list, /businessId: business\.id/);
  assert.match(list, /take: CUSTOMERS_PER_PAGE/);
  assert.match(list, /skip: \(currentPage - 1\) \* CUSTOMERS_PER_PAGE/);
  assert.doesNotMatch(list, /findMany\(\{\s*\}\)/);
});

test("U6 simple and advanced customers share one route with presentation-only controls", () => {
  assert.match(list, /resolveExperienceMode/);
  assert.match(list, /data-experience-customers=\{isSimpleExperience \? "simple" : "advanced"\}/);
  assert.match(list, /!isSimpleExperience && canReviewDuplicates/);
  assert.match(list, /copy\.advancedOptions/);
  assert.match(list, /copy\.scan/);
  assert.doesNotMatch(list, /simple-customers/);
});

test("U6 keeps advanced management and mutations unavailable to staff and viewers", () => {
  const businessId = "business-a";
  assert.equal(canPerform({ role: "STAFF", businessId }, businessId, "CUSTOMERS_EDIT"), false);
  assert.equal(canPerform({ role: "VIEWER", businessId }, businessId, "LOYALTY_EARN"), false);
  assert.match(list, /canReviewDuplicates \? <section id="add-customer"/);
  assert.match(detail, /canEarnLoyalty/);
  assert.match(detail, /canRedeemLoyalty/);
});

test("U6 customer detail distinguishes visits, points, and sales amount loyalty in both languages", () => {
  assert.equal(getLoyaltyModeLabel("AR", "VISITS"), "زيارات");
  assert.equal(getLoyaltyModeLabel("AR", "POINTS"), "نقاط");
  assert.equal(getLoyaltyModeLabel("AR", "SALES_AMOUNT"), "قيمة المبيعات");
  assert.equal(getLoyaltyModeLabel("EN", "VISITS"), "Visits");
  assert.equal(getLoyaltyModeLabel("EN", "POINTS"), "Points");
  assert.equal(getLoyaltyModeLabel("EN", "SALES_AMOUNT"), "Sales amount");
  assert.match(detail, /loyaltyModeLabel/);
  assert.match(detail, /copy\.addVisit/);
  assert.match(detail, /copy\.recordSale/);
  assert.match(detail, /LoyaltySubmitButton/);
  assert.match(detail, /RedeemRewardDialog/);
});

test("U6 retains dashboard-compatible reward-ready filters and direction-safe values", () => {
  assert.deepEqual(getCustomerSegmentWhere("REWARD_READY", 5), { isActive: true, balance: { gte: 5 } });
  assert.match(list, /segment=REWARD_READY/);
  assert.match(list, /dir="ltr" className="mt-1 text-sm text-slate-500"/);
  assert.match(detail, /dir="ltr" className="rounded-full bg-white\/10/);
  assert.match(detail, /name="phone"[\s\S]{0,240}dir="ltr"/);
  assert.match(detail, /customerCode/);
});

test("U6 customer copy covers AR and EN list and detail surfaces", () => {
  const ar = customerUiCopy("AR");
  const en = customerUiCopy("EN");
  assert.equal(ar.customers, "العملاء");
  assert.equal(en.customers, "Customers");
  assert.equal(ar.profile, "ملف العميل");
  assert.equal(en.profile, "Customer profile");
  assert.equal(ar.searchPlaceholder, "الاسم أو الهاتف أو كود العميل");
  assert.equal(en.searchPlaceholder, "Name, phone, or customer code");
  assert.equal(ar.customerCard, "كارت العميل");
  assert.equal(en.customerCard, "Customer card");
});

test("U6 localizes segments and keeps simple and advanced modes on the same language source", () => {
  assert.equal(getCustomerSegmentLabel("NEW", "AR"), "جديد");
  assert.equal(getCustomerSegmentLabel("AT_RISK", "AR"), "معرّض للتوقف");
  assert.equal(getCustomerSegmentLabel("REWARD_READY", "EN"), "Reward ready");
  assert.equal(getCustomerSegmentLabel("INACTIVE", "EN"), "Inactive");
  assert.match(list, /const copy = customerUiCopy\(language\)/);
  assert.match(detail, /const copy = customerUiCopy\(language\)/);
  assert.match(list, /data-experience-customers=\{isSimpleExperience \? "simple" : "advanced"\}/);
  assert.match(detail, /data-experience-customer-detail=\{isSimpleExperience \? "simple" : "advanced"\}/);
});

test("U6 language is fetched from the authenticated User and filter URLs stay unchanged", () => {
  assert.match(list, /select: \{ language: true \}/);
  assert.match(detail, /select: \{ language: true \}/);
  assert.match(list, /normalizeLanguage\(authenticatedUser\?\.language\)/);
  assert.match(detail, /normalizeLanguage\(authenticatedUser\?\.language\)/);
  assert.match(list, /parameters\.set\("segment", segment\)/);
  assert.match(list, /parameters\.set\("status", status\)/);
  assert.match(list, /segment=REWARD_READY/);
  assert.match(list, /status=inactive/);
  assert.equal(getLanguageDirection("AR"), "rtl");
  assert.equal(getLanguageDirection("EN"), "ltr");
});

test("U6 has separate route loading and error presentations without schema work", () => {
  assert.match(source("app/businesses/[slug]/customers/loading.tsx"), /TablePageSkeleton/);
  assert.match(source("app/businesses/[slug]/customers/error.tsx"), /PageErrorState/);
  assert.match(source("app/businesses/[slug]/customers/[customerId]/loading.tsx"), /DetailPageSkeleton/);
  assert.equal(source("prisma/schema.prisma").includes("U6"), false);
});
