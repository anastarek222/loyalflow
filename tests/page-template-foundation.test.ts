import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("U4 page container provides default, wide, and narrow content widths", () => {
  const container = source("components/page-layout/page-container.tsx");
  for (const variant of ["default", "wide", "narrow"]) assert.match(container, new RegExp(`${variant}:`));
  assert.match(container, /max-w-6xl/);
  assert.match(container, /max-w-screen-2xl/);
  assert.match(container, /max-w-3xl/);
});

test("U4 page and section headers preserve semantic heading hierarchy and action slots", () => {
  const header = source("components/page-layout/page-header.tsx");
  assert.match(header, /<h1/);
  assert.match(header, /<h2/);
  for (const slot of ["eyebrow", "primaryAction", "secondaryActions", "metadata", "actions", "count"]) assert.match(header, new RegExp(slot));
});

test("U4 templates compose list, detail, settings, analytics, and operational slots", () => {
  const templates = source("components/page-layout/templates.tsx");
  for (const template of ["ListPageTemplate", "DetailPageTemplate", "SettingsPageTemplate", "AnalyticsPageTemplate", "OperationalPageTemplate"]) assert.match(templates, new RegExp(`export function ${template}`));
  for (const slot of ["toolbar", "pagination", "sideRail", "navigation", "kpis", "charts", "table", "stickyActions"]) assert.match(templates, new RegExp(slot));
  assert.match(templates, /<aside/);
});

test("U4 toolbar, tabs, stats, and summaries remain compositional", () => {
  const files = ["page-toolbar.tsx", "page-tabs.tsx", "stat.tsx", "summary-panel.tsx"].map((file) => source(`components/page-layout/${file}`)).join("\n");
  for (const name of ["PageToolbar", "PageTabs", "StatGrid", "StatCard", "SummaryPanel", "DefinitionList"]) assert.match(files, new RegExp(name));
  assert.match(files, /overflow-x-auto/);
  assert.match(files, /dir="ltr"/);
});

test("U4 route states expose loading, error, empty, unavailable, and tenant-context foundations", () => {
  const states = source("components/page-layout/states.tsx");
  for (const name of ["PageHeaderSkeleton", "TablePageSkeleton", "DetailPageSkeleton", "AnalyticsPageSkeleton", "PageErrorState", "InitialEmptyState", "FilteredEmptyState", "PagePermissionDeniedState", "EntityUnavailableState", "EmptyTenantContextState"]) assert.match(states, new RegExp(name));
  assert.match(source("app/dashboard/loading.tsx"), /AnalyticsPageSkeleton/);
  assert.match(source("app/businesses/loading.tsx"), /TablePageSkeleton/);
  assert.match(source("app/dashboard/error.tsx"), /RouteErrorState/);
  assert.match(source("app/businesses/error.tsx"), /RouteErrorState/);
});

test("U4 templates use logical layout and leave the U3 shell functionally untouched", () => {
  const templates = ["page-container.tsx", "page-header.tsx", "page-tabs.tsx", "page-toolbar.tsx", "stat.tsx", "summary-panel.tsx", "sticky-action-bar.tsx", "templates.tsx", "states.tsx"].map((file) => source(`components/page-layout/${file}`)).join("\n");
  assert.doesNotMatch(templates, /dir=["']rtl["']/);
  assert.doesNotMatch(templates, /\b(?:ml|mr|pl|pr|left|right)-/);
  assert.doesNotMatch(source("components/authenticated-app-shell.tsx"), /PageContainer|PageHeader|PageTemplate/);
});

test("U4 does not alter Prisma schema or migrations", () => {
  const changed = `${execFileSync("git", ["diff", "--name-only"], { cwd: root, encoding: "utf8" })}\n${execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })}`.split("\n").filter(Boolean);
  assert.equal(changed.some((path) => path === "prisma/schema.prisma" || path.startsWith("prisma/migrations/")), false);
});
