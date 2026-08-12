import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const reports = source("app/businesses/[slug]/reports/page.tsx");
const staff = source("app/businesses/[slug]/reports/staff/page.tsx");
const charts = source("components/reports/report-charts.tsx");
const navigation = source("components/reports/report-navigation.tsx");
const exportRoute = source("app/businesses/[slug]/reports/export/route.ts");

test("T006 Reports workspace preserves capability, entitlement, and presentation boundaries", () => {
  assert.match(
    reports,
    /canPerform\([\s\S]{0,100}session\.user,[\s\S]{0,80}business\.id,[\s\S]{0,80}"REPORTS_VIEW"/,
  );
  assert.match(reports, /hasFeatureEntitlement\(business\.plan, "REPORTING"\)/);
  assert.match(reports, /resolveExperienceMode\(/);
  assert.match(reports, /const simple = experienceMode === "SIMPLE"/);
  assert.match(reports, /data-experience-mode=\{experienceMode\}/);
  assert.doesNotMatch(
    reports,
    /prisma\.(?:loyaltyTransaction|customer|rewardRedemption)\.(?:create|update|delete)|prisma\.\$transaction/,
  );
});

test("T006 Report filters and analytics queries retain tenant, date, segment, branch, and staff scope", () => {
  assert.match(reports, /parseReportDateRange\(/);
  assert.match(reports, /resolveReportScope\(/);
  assert.match(
    reports,
    /const customerWhere:[\s\S]{0,100}businessId: business\.id/,
  );
  assert.match(
    reports,
    /const transactionWhere:[\s\S]{0,100}businessId: business\.id,[\s\S]{0,120}gte: fromDate,[\s\S]{0,80}lte: toDate,[\s\S]{0,80}\.\.\.operationScope/,
  );
  assert.match(
    reports,
    /const redemptionWhere:[\s\S]{0,100}businessId: business\.id,[\s\S]{0,120}gte: fromDate,[\s\S]{0,80}lte: toDate,[\s\S]{0,80}\.\.\.operationScope/,
  );
  assert.match(reports, /getCustomerSegmentWhere\(/);
  assert.match(reports, /getRecordedSalesWhere\(\)/);
});

test("T006 Reports keep canonical financial and historical calculations server-side", () => {
  assert.match(reports, /summarizeLedgerOperations\(ledgerOperations/);
  assert.match(reports, /unresolvedExceptions: openReversalExceptions/);
  assert.match(reports, /createHistoricalAnalyticsTrends\(/);
  assert.match(reports, /calculateAverageDaysToFirstReward\(/);
  assert.match(reports, /calculateAverageDaysBetweenVisits\(/);
  assert.match(reports, /calculateRepeatCustomerRate\(/);
  assert.match(reports, /countDistinctCustomers\(/);
  assert.match(reports, /data-ledger-summary="gross-reversal-net"/);
  assert.doesNotMatch(
    charts,
    /prisma|fetch\(|calculateAverage|summarizeLedger/,
  );
  assert.match(charts, /data-report-charts="server-derived-buckets"/);
  assert.match(charts, /safeReportNumber/);
});

test("T006 Reports navigation, Staff attribution, and export retain canonical query contracts", () => {
  assert.match(navigation, /data-report-navigation="true"/);
  assert.match(navigation, /`\/businesses\/\$\{slug\}\/reports\?\$\{query\}`/);
  assert.match(
    navigation,
    /`\/businesses\/\$\{slug\}\/reports\/staff\?\$\{query\}`/,
  );
  assert.match(reports, /getReportQueryString\(/);
  assert.match(staff, /getCanonicalStaffAttribution/);
  assert.match(staff, /attributedStaffId/);
  assert.match(exportRoute, /canExportBusinessData\(/);
  assert.match(
    exportRoute,
    /hasFeatureEntitlement\(business\.plan, "REPORTING"\)/,
  );
  assert.match(exportRoute, /resolveReportScope\(/);
  assert.match(exportRoute, /Spreadsheet Formula Injection/);
});

test("T006 Reports expose the refreshed analytics workspace without a second data path", () => {
  assert.match(reports, /data-reports-workspace="true"/);
  assert.match(reports, /data-report-filters="true"/);
  assert.match(reports, /data-report-summary="true"/);
  assert.match(reports, /data-report-trends="server-derived"/);
  assert.match(reports, /Reports & analytics/);
  assert.match(reports, /Period & report scope/);
  assert.match(reports, /Export period activity CSV/);
  assert.doesNotMatch(reports, /fetch\(|localStorage|sessionStorage/);
});
