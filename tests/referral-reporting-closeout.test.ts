import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const navigation = source("components/reports/report-navigation.tsx");
const referralReport = source("app/businesses/[slug]/reports/referrals/page.tsx");
const membershipCommand = source(
  "lib/server/business/public-membership-command.ts",
);

test("Referral closeout gives REPORTS_VIEW users a discoverable AR/EN reports surface", () => {
  assert.match(navigation, /active: "overview" \| "staff" \| "referrals"/);
  assert.match(navigation, /\/reports\/referrals\?\$\{query\}/);
  assert.match(navigation, /label: "الإحالات"/);
  assert.match(navigation, /label: "Referrals"/);
  assert.match(referralReport, /"REPORTS_VIEW"/);
  assert.match(referralReport, /"REPORTING"/);
  assert.match(referralReport, /active="referrals"/);
});

test("Referral report is tenant and date scoped and does not invent branch or staff attribution", () => {
  assert.match(referralReport, /prisma\.referral\.findMany/);
  assert.match(referralReport, /businessId: business\.id/);
  assert.match(referralReport, /createdAt: \{ gte: from, lte: to \}/);
  assert.match(referralReport, /Referral records do not currently carry branch or staff attribution/);
  assert.doesNotMatch(referralReport, /name="branch"|name="staff"/);
});

test("Referral report exposes bilingual summary, empty state, and customer linkage", () => {
  assert.match(referralReport, /"الإحالات المسجلة", "Recorded referrals"/);
  assert.match(referralReport, /"العملاء المُحيلون", "Referring customers"/);
  assert.match(referralReport, /"العملاء المنضمون بالإحالة", "Referred customers"/);
  assert.match(referralReport, /"لا توجد إحالات في هذه الفترة", "No referrals in this period"/);
  assert.match(referralReport, /referrer: \{ select:/);
  assert.match(referralReport, /referred: \{ select:/);
  assert.match(referralReport, /sm:grid-cols-3/);
});

test("Referral closeout keeps referral recording reward-neutral", () => {
  assert.doesNotMatch(membershipCommand, /balance:\s*\{\s*(increment|decrement)/);
  assert.doesNotMatch(membershipCommand, /rewardUnlock\.create/);
  assert.doesNotMatch(membershipCommand, /loyaltyTransaction\.create/);
});
