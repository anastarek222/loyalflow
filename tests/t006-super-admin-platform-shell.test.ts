import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { buildShellNavigation } from "@/lib/app-shell-navigation";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

const navigation = source("lib/app-shell-navigation.ts");
const appShell = source("components/authenticated-app-shell.tsx");
const sidebar = source("components/app-sidebar.tsx");
const topbar = source("components/app-topbar.tsx");
const mobile = source("components/mobile-bottom-navigation.tsx");
const operations = source("app/operations/page.tsx");
const plans = source("app/plans/page.tsx");
const owners = source("app/business-owners/page.tsx");

test("T006 P9.1 exposes one complete Super Admin platform navigation", () => {
  const items = buildShellNavigation({
    language: "EN",
    user: { role: "SUPER_ADMIN", businessId: null },
  }).flatMap((group) => group.items);

  assert.deepEqual(
    items.map((item) => item.id),
    ["overview", "businesses", "owners", "plans", "platformOps"],
  );
  assert.deepEqual(
    items.map((item) => item.href),
    ["/dashboard", "/businesses", "/business-owners", "/plans", "/operations"],
  );

  const ownerItems = buildShellNavigation({
    language: "EN",
    user: { role: "OWNER", businessId: "business-a" },
  }).flatMap((group) => group.items);
  assert.deepEqual(ownerItems.map((item) => item.href), ["/dashboard"]);
});

test("T006 P9.1 wraps every platform destination in the authenticated locale shell", () => {
  for (const path of [
    "app/dashboard/layout.tsx",
    "app/businesses/layout.tsx",
    "app/business-owners/layout.tsx",
    "app/plans/layout.tsx",
    "app/operations/layout.tsx",
  ]) {
    assert.equal(existsSync(join(root, path)), true);
    assert.match(source(path), /<AuthenticatedLocaleShell>/);
  }
});

test("T006 P9.1 visually distinguishes platform scope across desktop and topbar", () => {
  assert.match(appShell, /data-platform-workspace/);
  assert.match(sidebar, /data-platform-sidebar/);
  assert.match(sidebar, /data-platform-context="true"/);
  assert.match(sidebar, /Platform administration/);
  assert.match(sidebar, /Global scope/);
  assert.match(topbar, /data-platform-topbar/);
  assert.match(navigation, /parent: platformParent/);
});

test("T006 P9.1 provides full mobile platform navigation without a tenant context", () => {
  assert.match(mobile, /!business && user\.role === "SUPER_ADMIN"/);
  assert.match(mobile, /data-platform-mobile-navigation="true"/);
  for (const id of ["businesses", "owners", "plans", "platformOps"]) {
    assert.match(mobile, new RegExp(`${id}:`));
  }
  assert.match(mobile, /grid-cols-5/);
});

test("T006 P9.1 preserves Super Admin authorization and canonical platform writers", () => {
  for (const page of [operations, plans, owners]) {
    assert.match(page, /session\.user\.role !== "SUPER_ADMIN"/);
    assert.match(page, /redirect\("\/dashboard"\)/);
  }
  assert.match(owners, /recordBusinessPaymentAction/);
  assert.match(owners, /setBusinessPlatformStatusAction/);
  assert.match(owners, /updateBusinessPlanAction/);
  assert.match(plans, /updatePlanLimitsAction\.bind\(null, plan\)/);
  assert.doesNotMatch(
    operations,
    /prisma\.[a-zA-Z]+\.(?:create|update|delete|upsert)\(/,
  );
});

test("T006 P9.1 keeps deferred preset administration out of this slice", () => {
  assert.doesNotMatch(
    `${navigation}\n${appShell}\n${sidebar}\n${mobile}`,
    /\/industries|\/presets/,
  );
  assert.doesNotMatch(
    `${appShell}\n${sidebar}\n${topbar}\n${mobile}`,
    /fetch\(|localStorage|sessionStorage/,
  );
});
