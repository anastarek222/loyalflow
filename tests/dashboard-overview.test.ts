import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  DASHBOARD_RECENT_ACTIVITY_LIMIT,
  getBusinessDashboardActions,
  getDashboardSegmentShortcuts,
  getGlobalDashboardMode,
  shouldShowOnboardingChecklist,
} from "../lib/dashboard/overview";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const dashboard = source("app/dashboard/page.tsx");
const businessDashboard = source("app/businesses/[slug]/page.tsx");

const noCapabilities = {
  canScan: false,
  canViewReports: false,
  canManageSettings: false,
  canManageUsers: false,
};

test("U5 exposes Scan as the primary dashboard operation only with loyalty permission", () => {
  const allowed = getBusinessDashboardActions("north-star", { ...noCapabilities, canScan: true });
  const denied = getBusinessDashboardActions("north-star", noCapabilities);
  assert.equal(allowed[0]?.id, "scan");
  assert.equal(allowed.find((action) => action.id === "scan")?.href, "/businesses/north-star/scan");
  assert.equal(denied.some((action) => action.id === "scan"), false);
  assert.match(businessDashboard, /const scanAction = actions\.find/);
});

test("U5 daily KPI presentation never presents visits or points as currency revenue", () => {
  const kpiArea = businessDashboard.slice(businessDashboard.indexOf('aria-label="Daily key performance indicators"'), businessDashboard.indexOf("canViewReports ? <section"));
  assert.match(kpiArea, /totalCustomers/);
  assert.match(kpiArea, /todayActivity/);
  assert.match(kpiArea, /todayRedemptions/);
  assert.doesNotMatch(kpiArea, /BusinessSalesKpis|مبيعات|salesAmount|currency/i);
});

test("U5 compresses onboarding after core operational readiness", () => {
  assert.equal(shouldShowOnboardingChecklist(false), true);
  assert.equal(shouldShowOnboardingChecklist(true), false);
  assert.match(businessDashboard, /shouldShowOnboardingChecklist\(onboarding\.coreReady\)/);
});

test("U5 keeps staff clear of owner-only setup and configuration actions", () => {
  const staffActions = getBusinessDashboardActions("north-star", { ...noCapabilities, canScan: true });
  assert.equal(staffActions.some((action) => ["settings", "team", "branches", "campaigns"].includes(action.id)), false);
});

test("U5 viewer actions remain read-only", () => {
  const viewerActions = getBusinessDashboardActions("north-star", { ...noCapabilities, canViewReports: true });
  assert.deepEqual(viewerActions.map((action) => action.id), ["customers", "reports"]);
  assert.equal(viewerActions.some((action) => action.mutation), false);
});

test("U5 segment shortcuts are a supported subset of Customer filters", () => {
  assert.deepEqual(getDashboardSegmentShortcuts("VISITS"), ["NEW", "ACTIVE", "AT_RISK", "VIP", "REWARD_READY"]);
  assert.deepEqual(getDashboardSegmentShortcuts("SALES_AMOUNT"), ["NEW", "ACTIVE", "AT_RISK", "VIP", "REWARD_READY"]);
  assert.match(businessDashboard, /customers\?segment=\$\{segment\}/);
});

test("U5 bounds recent activity and preserves the dedicated Activity destination", () => {
  assert.equal(DASHBOARD_RECENT_ACTIVITY_LIMIT, 5);
  assert.match(businessDashboard, /take: DASHBOARD_RECENT_ACTIVITY_LIMIT/);
  assert.match(businessDashboard, /\/activity/);
});

test("U5 leaves Reports as the deep analytics destination", () => {
  assert.match(businessDashboard, /dictionary\.reports/);
  assert.match(businessDashboard, /\/reports/);
  assert.doesNotMatch(businessDashboard, /<DashboardCharts/);
});

test("U5 introduces no second notification bell", () => {
  assert.match(businessDashboard, /trigger="shell"/);
  assert.doesNotMatch(businessDashboard, /Bell|🔔|notifications=1/);
});

test("U5 dashboard directions remain shell-derived and use logical utility classes", () => {
  const pages = `${dashboard}\n${businessDashboard}`;
  assert.doesNotMatch(pages, /dir=["']rtl["']/);
  assert.doesNotMatch(pages, /\b(?:ml|mr|pl|pr|left|right)-/);
  assert.match(pages, /dir="ltr"/);
});

test("U5 global dashboard safely models zero, one, and multiple workspaces", () => {
  assert.equal(getGlobalDashboardMode(0), "empty");
  assert.equal(getGlobalDashboardMode(1), "single");
  assert.equal(getGlobalDashboardMode(2), "multiple");
  assert.match(dashboard, /getGlobalDashboardMode\(businesses\.length\)/);
});

test("U5 does not alter Prisma schema or migrations", () => {
  const changed = `${execFileSync("git", ["diff", "--name-only"], { cwd: root, encoding: "utf8" })}\n${execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })}`.split("\n").filter(Boolean);
  assert.equal(changed.some((path) => path === "prisma/schema.prisma" || path.startsWith("prisma/migrations/")), false);
});
