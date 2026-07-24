import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { parseReportDateRange, MAX_REPORT_RANGE_DAYS } from "@/lib/analytics/date-range";
import { getReportQueryString, resolveReportScope } from "@/lib/analytics/report-filters";
import { safeReportNumber } from "@/lib/reports/presentation";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const overview = source("app/businesses/[slug]/reports/page.tsx");
const staff = source("app/businesses/[slug]/reports/staff/page.tsx");
const exportRoute = source("app/businesses/[slug]/reports/export/route.ts");
const historical = source("app/api/analytics/historical-trends/route.ts");

test("U9 retains canonical report routes and slug-preserving shared navigation", () => {
  assert.match(overview, /components\/reports\/report-navigation/);
  assert.match(staff, /active="staff"/);
  assert.match(source("components/reports/report-navigation.tsx"), /\/businesses\/\$\{slug\}\/reports/);
  assert.match(overview, /reports\/export/);
});

test("U9 reports remain historical and presentation mode is not authorization", () => {
  assert.match(overview, /createHistoricalAnalyticsTrends/);
  assert.match(overview, /data-experience-mode=\{experienceMode\}/);
  assert.match(staff, /data-experience-mode=\{experienceMode\}/);
  assert.doesNotMatch(source("lib/permissions.ts"), /ExperienceMode|experienceMode/);
  assert.doesNotMatch(overview, /Scan customer|مسح عميل/);
});

test("U9 validates bounded inclusive dates and tenant-scoped branch/staff filters", () => {
  assert.equal(MAX_REPORT_RANGE_DAYS, 366);
  assert.equal(parseReportDateRange({ from: "2026-02-31", to: "2026-03-01" }), null);
  assert.equal(parseReportDateRange({ from: "2026-01-01", to: "2027-01-02" }), null);
  assert.equal(resolveReportScope({ businessId: "a", branches: [{ id: "foreign", businessId: "b", name: "Foreign", isActive: true }], staff: [], branchId: "foreign" }), null);
  assert.match(historical, /resolveReportScope/);
  assert.match(exportRoute, /resolveReportScope/);
});

test("U9 preserves supported filters for export and protects export server-side", () => {
  const query = getReportQueryString({ from: "2026-07-01", to: "2026-07-31", segment: "ACTIVE", loyaltyMode: "POINTS", branchId: "branch-a", attributedStaffId: "staff-a" });
  assert.match(query, /segment=ACTIVE/); assert.match(query, /branch=branch-a/); assert.match(query, /staff=staff-a/);
  assert.match(exportRoute, /canExportBusinessData/);
  assert.match(exportRoute, /businessId: business\.id/);
  assert.match(exportRoute, /escapeCsvCell/);
  assert.match(exportRoute, /Spreadsheet Formula Injection/);
  assert.doesNotMatch(exportRoute, /transaction\.note/);
  assert.doesNotMatch(exportRoute, /customer\.phone/);
});

test("U9 uses persisted attribution, safe chart values, localized responsive foundations", () => {
  assert.match(staff, /attributedStaffId/);
  assert.match(staff, /rewardRedemptions/);
  assert.match(staff, /getCanonicalStaffAttribution/);
  assert.match(source("components/reports/report-charts.tsx"), /safeReportNumber/);
  assert.equal(safeReportNumber(Number.NaN), 0); assert.equal(safeReportNumber(Infinity), 0);
  const chart = source("components/reports/report-charts.tsx");
  assert.match(chart, /ResponsiveContainer/); assert.match(chart, /language === "AR"/);
  assert.match(source("lib/reports/presentation.ts"), /Business reports/);
  assert.match(source("lib/reports/presentation.ts"), /تقارير النشاط/);
  assert.match(source("app/businesses/[slug]/reports/loading.tsx"), /aria-busy/);
});

test("U9 never labels visits or points as currency, while recorded sales remain explicit", () => {
  assert.match(source("lib/analytics/report-filters.ts"), /saleAmount: \{ not: null \}/);
  assert.doesNotMatch(overview, /points revenue|visit revenue/i);
  assert.match(overview, /business\.unitName/);
});
