import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reportsPage = readFileSync(
  "app/businesses/[slug]/reports/page.tsx",
  "utf8",
);

test("reports page uses the business timezone for calendar ranges and timestamps", () => {
  assert.match(reportsPage, /getReportPresetDateRange/);
  assert.match(reportsPage, /timezone:\s*true/);
  assert.match(reportsPage, /const timeZone = business\.timezone \?\? "UTC"/);
  assert.match(
    reportsPage,
    /new Intl\.DateTimeFormat\(locale, \{[\s\S]*?timeZone,[\s\S]*?\}\)/,
  );
  assert.match(
    reportsPage,
    /parseReportDateRange\(\{[\s\S]*?timeZone,[\s\S]*?\}\)/,
  );
});

test("reports page keeps report database ranges half-open", () => {
  assert.equal((reportsPage.match(/lt: toExclusive/g) ?? []).length, 6);
  assert.equal(reportsPage.includes("lte: toDate"), false);
  assert.match(
    reportsPage,
    /countOpenReversalExceptions\(prisma, \{[\s\S]*?to: toDate,/,
  );
});

test("reports page buckets historical trends in the business timezone", () => {
  assert.match(
    reportsPage,
    /createHistoricalAnalyticsTrends\([\s\S]*?fromDate,[\s\S]*?toDate,[\s\S]*?timeZone,[\s\S]*?\);/,
  );
});

test("reports page no longer falls back to legacy UTC range wiring", () => {
  assert.equal(reportsPage.includes("getReportRange("), false);
  assert.equal(reportsPage.includes("formatUtcDateInput"), false);
  assert.equal(reportsPage.includes("parseUtcDateInput"), false);
  assert.match(reportsPage, /!requestedPeriod && \(query\.from \|\| query\.to\)/);
});
