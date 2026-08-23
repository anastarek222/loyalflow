import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reports = readFileSync(
  new URL("../app/businesses/[slug]/reports/page.tsx", import.meta.url),
  "utf8",
);
const reportNavigation = readFileSync(
  new URL("../components/reports/report-navigation.tsx", import.meta.url),
  "utf8",
);

test("Reports overview uses language-aware dates and direction-safe final presentation", () => {
  assert.match(reports, /const locale = getLanguageLocale\(language\)/);
  assert.match(reports, /new Intl\.DateTimeFormat\(locale/);
  assert.doesNotMatch(reports, /Intl\.DateTimeFormat\("ar-EG"/);
  assert.match(reports, /dir=\{language === "AR" \? "rtl" : "ltr"\}/);
  assert.match(reports, /data-report-advanced-metrics="true"/);
  assert.match(reports, /data-report-impact="true"/);
  assert.match(reports, /Advanced report metrics/);
  assert.match(reports, /Customer rankings/);
  assert.match(reports, /Recent activity/);
  assert.match(reports, /Top customers/);
  assert.match(reports, /getCustomerSegmentLabel\(segment, language\)/);
  assert.match(reports, /<table className="min-w-full text-start text-sm">/);
});

test("Reports navigation uses the canonical semantic foreground for the active tab", () => {
  assert.match(reportNavigation, /bg-primary text-primary-foreground/);
  assert.doesNotMatch(reportNavigation, /bg-primary text-white/);
  assert.match(reportNavigation, /aria-current=\{active === item\.id \? "page"/);
});

test("Reports overview preserves server-derived analytics and tenant-scope boundaries", () => {
  assert.match(reports, /resolveReportScope\(/);
  assert.match(reports, /getRecordedSalesWhere\(\)/);
  assert.match(reports, /summarizeLedgerOperations\(/);
  assert.match(reports, /createHistoricalAnalyticsTrends\(/);
  assert.match(reports, /countOpenReversalExceptions\(/);
  assert.match(reports, /hasFeatureEntitlement\(business\.plan, "REPORTING"\)/);
  assert.match(reports, /canPerform\(session\.user, business\.id, "REPORTS_VIEW"\)/);
});
