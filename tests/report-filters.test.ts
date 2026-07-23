import assert from "node:assert/strict";
import test from "node:test";

import { parseReportDateRange } from "@/lib/analytics/date-range";
import {
  getCanonicalStaffAttribution,
  getReportQueryString,
  getRecordedSalesWhere,
  resolveReportScope,
} from "@/lib/analytics/report-filters";

const now = new Date("2026-07-20T12:00:00.000Z");
const branches = [
  { id: "branch-a", businessId: "business-a", name: "Downtown", isActive: true },
  { id: "branch-old", businessId: "business-a", name: "Historic", isActive: false },
  { id: "branch-b", businessId: "business-b", name: "Foreign", isActive: true },
];
const staff = [
  { id: "staff-a", businessId: "business-a" },
  { id: "staff-b", businessId: "business-b" },
];

test("report and export date filters share inclusive UTC boundaries", () => {
  const range = parseReportDateRange({
    from: "2026-07-01",
    to: "2026-07-31",
    now,
  });

  assert.deepEqual(range && {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  }, {
    from: "2026-07-01T00:00:00.000Z",
    to: "2026-07-31T23:59:59.999Z",
  });
  assert.equal(parseReportDateRange({ from: "invalid", to: "2026-07-01", now }), null);
  assert.equal(parseReportDateRange({ from: "2025-01-01", to: "2026-07-01", now }), null);
});

test("business-wide report scope preserves historical null-branch operations", () => {
  assert.deepEqual(resolveReportScope({ businessId: "business-a", branches, staff }), {});
  assert.deepEqual(resolveReportScope({
    businessId: "business-a", branches, staff, branchId: "branch-a",
  }), { branchId: "branch-a" });
  assert.deepEqual(resolveReportScope({
    businessId: "business-a", branches, staff, branchId: "branch-old",
  }), { branchId: "branch-old" });
});

test("cross-tenant report branch and staff filters are rejected", () => {
  assert.equal(resolveReportScope({
    businessId: "business-a", branches, staff, branchId: "branch-b",
  }), null);
  assert.equal(resolveReportScope({
    businessId: "business-a", branches, staff, staffId: "staff-b",
  }), null);
});

test("staff performance attribution never falls back to the operation creator", () => {
  assert.equal(getCanonicalStaffAttribution({ attributedStaffId: "staff-a" }), "staff-a");
  assert.equal(getCanonicalStaffAttribution({ attributedStaffId: null }), null);
});

test("report export URLs retain the report's supported filters", () => {
  assert.equal(getReportQueryString({
    from: "2026-07-01", to: "2026-07-31", segment: "ACTIVE",
    loyaltyMode: "SALES_AMOUNT", branchId: "branch-a", attributedStaffId: "staff-a",
  }), "from=2026-07-01&to=2026-07-31&segment=ACTIVE&loyaltyMode=SALES_AMOUNT&branch=branch-a&staff=staff-a");
});

test("only explicit saleAmount values qualify as recorded sales", () => {
  assert.deepEqual(getRecordedSalesWhere(), {
    type: "EARN",
    saleAmount: { not: null },
  });
});
