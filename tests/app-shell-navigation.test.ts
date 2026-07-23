import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildShellNavigation,
  businessSlugFromPathname,
  getShellPageContext,
  isNavigationItemActive,
} from "../lib/app-shell-navigation";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const business = { id: "business-1", slug: "north-star", name: "North Star" };
const owner = { role: "OWNER" as const, businessId: business.id };
const staff = { role: "STAFF" as const, businessId: business.id };
const viewer = { role: "VIEWER" as const, businessId: business.id };

const links = (user: typeof owner | typeof staff | typeof viewer) =>
  buildShellNavigation({ language: "EN", user, business }).flatMap((group) => group.items);

test("U3 mobile business navigation derives and passes the active business slug", () => {
  assert.equal(businessSlugFromPathname("/businesses/north-star/customers/customer-1"), "north-star");
  assert.match(source("components/authenticated-app-shell.tsx"), /businessSlugFromPathname\(pathname\)/);
  assert.match(source("components/app-topbar.tsx"), /business=\{activeBusiness\}/);
  assert.match(source("components/mobile-sidebar-wrapper.tsx"), /business=\{business\}/);
  assert.match(source("components/mobile-sidebar.tsx"), /buildShellNavigation\(\{ language, user, business, experienceMode \}\)/);
});

test("business navigation URLs retain the active business slug and global routes invent none", () => {
  assert.ok(links(owner).every((entry) => entry.href === "/dashboard" || entry.href.startsWith("/businesses/north-star")));
  const global = buildShellNavigation({ language: "EN", user: owner });
  assert.deepEqual(global.flatMap((group) => group.items).map((entry) => entry.href), ["/dashboard"]);
});

test("navigation is capability-derived and hides inaccessible administration", () => {
  const staffLinks = links(staff).map((entry) => entry.id);
  assert.ok(staffLinks.includes("scan"));
  assert.equal(staffLinks.includes("reports"), false);
  assert.equal(staffLinks.includes("settings"), false);
  assert.equal(staffLinks.includes("team"), false);
  const viewerLinks = links(viewer).map((entry) => entry.id);
  assert.ok(viewerLinks.includes("reports"));
  assert.equal(viewerLinks.includes("scan"), false);
  assert.equal(viewerLinks.includes("branches"), false);
});

test("active matching handles children and page context avoids raw ids", () => {
  assert.equal(isNavigationItemActive("/businesses/north-star/reports/staff", "/businesses/north-star/reports"), true);
  assert.equal(isNavigationItemActive("/businesses/north-star/customers", "/businesses/other/customers"), false);
  assert.deepEqual(getShellPageContext("/businesses/north-star/customers/customer-1", "EN", business), { parent: "North Star", title: "Customer details" });
});

test("the shell has one canonical notification control and direction remains user-derived", () => {
  const topbar = source("components/app-topbar.tsx");
  assert.match(topbar, /\?notifications=1/);
  assert.doesNotMatch(topbar, /dir=["']rtl["']/);
  assert.match(source("components/business-notifications-dialog.tsx"), /searchParams\.get\("notifications"\)/);
  assert.match(source("app/businesses/[slug]/page.tsx"), /trigger="shell"/);
  assert.match(source("components/mobile-bottom-navigation.tsx"), /entry\.id === "scan"/);
});

test("U3 does not change schemas or migrations", () => {
  const changed = `${execFileSync("git", ["diff", "--name-only"], { cwd: root, encoding: "utf8" })}\n${execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })}`.split("\n").filter(Boolean);
  assert.equal(changed.some((path) => path === "prisma/schema.prisma" || path.startsWith("prisma/migrations/")), false);
});
