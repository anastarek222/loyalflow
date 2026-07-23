import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  EXPERIENCE_MODE_DEFAULTS,
  getExperienceNavigationRules,
  resolveExperienceMode,
} from "../lib/experience-mode";
import { buildShellNavigation } from "../lib/app-shell-navigation";
import { canPerform, capabilities } from "../lib/permissions";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const business = { id: "business-1", slug: "north-star", name: "North Star" };
const owner = { role: "OWNER" as const, businessId: business.id };
const staff = { role: "STAFF" as const, businessId: business.id };

const entries = (user: typeof owner | typeof staff, experienceMode: "SIMPLE" | "ADVANCED") =>
  buildShellNavigation({ language: "EN", user, business, experienceMode }).flatMap((group) => group.items);

test("U5.1 defaults are deterministic by role", () => {
  assert.deepEqual(EXPERIENCE_MODE_DEFAULTS, {
    OWNER: "SIMPLE",
    MANAGER: "ADVANCED",
    STAFF: "SIMPLE",
    VIEWER: "SIMPLE",
    SUPER_ADMIN: "ADVANCED",
  });
});

test("U5.1 valid preferences override defaults and invalid preferences safely fall back", () => {
  assert.equal(resolveExperienceMode("ADVANCED", "OWNER"), "ADVANCED");
  assert.equal(resolveExperienceMode("SIMPLE", "MANAGER"), "SIMPLE");
  assert.equal(resolveExperienceMode("unknown", "OWNER"), "SIMPLE");
  assert.equal(resolveExperienceMode(null, "SUPER_ADMIN"), "ADVANCED");
});

test("U5.1 simple owner navigation keeps daily operations and hides primary management clutter", () => {
  const simple = entries(owner, "SIMPLE");
  const ids = simple.map((entry) => entry.id);
  assert.ok(ids.includes("scan"));
  assert.ok(ids.includes("customers"));
  assert.ok(ids.includes("activity"));
  for (const id of ["campaigns", "recovery", "team", "branches", "playbooks"] as const) {
    assert.equal(ids.includes(id), false);
  }
  assert.ok(simple.some((entry) => entry.action === "switch-mode"));
});

test("U5.1 advanced owner navigation preserves the complete U3 hierarchy", () => {
  const ids = entries(owner, "ADVANCED").map((entry) => entry.id);
  for (const id of ["scan", "customers", "activity", "rewards", "offers", "campaigns", "recovery", "reports", "staffReports", "team", "branches", "settings", "playbooks"] as const) {
    assert.ok(ids.includes(id));
  }
});

test("U5.1 staff simple navigation retains permitted Scan and Customers without a useless switch", () => {
  const simple = entries(staff, "SIMPLE");
  assert.ok(simple.some((entry) => entry.id === "scan"));
  assert.ok(simple.some((entry) => entry.id === "customers"));
  assert.equal(simple.some((entry) => entry.action === "switch-mode"), false);
  assert.equal(getExperienceNavigationRules({ mode: "SIMPLE", role: "STAFF", advancedDestinationCount: 0 }).showModeSwitcher, false);
});

test("U5.1 mode never changes capability results, routes, or the active tenant slug", () => {
  const simple = entries(owner, "SIMPLE").filter((entry) => !entry.action);
  const advanced = entries(owner, "ADVANCED");
  assert.ok(simple.every((entry) => advanced.some((candidate) => candidate.href === entry.href)));
  assert.ok([...simple, ...advanced].every((entry) => entry.href === "/dashboard" || entry.href.startsWith("/businesses/north-star")));
  for (const capability of capabilities) {
    assert.equal(canPerform(owner, business.id, capability), true);
  }
  assert.doesNotMatch(source("lib/permissions.ts"), /ExperienceMode|experienceMode/);
});

test("U5.1 dashboard uses one route and one data implementation with presentation-only sections", () => {
  const dashboard = source("app/businesses/[slug]/page.tsx");
  assert.match(dashboard, /data-experience-mode=\{experienceMode\}/);
  assert.match(dashboard, /data-experience-dashboard="simple"/);
  assert.match(source("components/open-advanced-dashboard-button.tsx"), /Open advanced dashboard/);
  assert.match(dashboard, /getExperienceModeCookieName/);
  assert.doesNotMatch(dashboard, /simple-dashboard/);
});

test("U5.1 persists only a validated presentation cookie with an accessible switcher", () => {
  const action = source("app/experience-mode/actions.ts");
  const switcher = source("components/experience-mode-switcher.tsx");
  assert.match(action, /isExperienceMode\(mode\)/);
  assert.match(action, /getExperienceModeCookieName\(session\.user\.id\)/);
  assert.match(action, /httpOnly: true/);
  assert.match(switcher, /aria-pressed=\{selected\}/);
  assert.match(switcher, /type="submit"/);
});

test("U5.1 adds no Prisma schema or migration change", () => {
  const changed = `${execFileSync("git", ["diff", "--name-only"], { cwd: root, encoding: "utf8" })}\n${execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })}`.split("\n").filter(Boolean);
  assert.equal(changed.some((path) => path === "prisma/schema.prisma" || path.startsWith("prisma/migrations/")), false);
});
