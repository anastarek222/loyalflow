import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { resolveRoleAwareEntry } from "../lib/dashboard/role-aware-entry";

const activeBusiness = { slug: "xtv", isActive: true };

test("single-business staff enters the scanner directly", () => {
  assert.equal(
    resolveRoleAwareEntry({
      role: "STAFF",
      business: activeBusiness,
      canScan: true,
    }),
    "/businesses/xtv/scan",
  );
});

test("owner, manager, and viewer enter their business directly", () => {
  for (const role of ["OWNER", "MANAGER", "VIEWER"] as const) {
    assert.equal(
      resolveRoleAwareEntry({ role, business: activeBusiness, canScan: false }),
      "/businesses/xtv",
    );
  }
});

test("staff without scan capability falls back to the authorized business", () => {
  assert.equal(
    resolveRoleAwareEntry({
      role: "STAFF",
      business: activeBusiness,
      canScan: false,
    }),
    "/businesses/xtv",
  );
});

test("global and unavailable workspace states do not auto-redirect", () => {
  assert.equal(
    resolveRoleAwareEntry({
      role: "SUPER_ADMIN",
      business: activeBusiness,
      canScan: true,
    }),
    null,
  );
  assert.equal(
    resolveRoleAwareEntry({ role: "OWNER", business: null, canScan: true }),
    null,
  );
  assert.equal(
    resolveRoleAwareEntry({
      role: "OWNER",
      business: { slug: "paused", isActive: false },
      canScan: true,
    }),
    null,
  );
});

test("dashboard keeps authentication and onboarding gates ahead of role-aware entry", () => {
  const dashboard = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const authGate = dashboard.indexOf('redirect("/login")');
  const onboardingGate = dashboard.indexOf('redirect("/onboarding")');
  const entryResolution = dashboard.indexOf("resolveRoleAwareEntry({");
  const entryRedirect = dashboard.indexOf("redirect(roleAwareEntry)");

  assert.ok(authGate >= 0);
  assert.ok(onboardingGate > authGate);
  assert.ok(entryResolution > onboardingGate);
  assert.ok(entryRedirect > entryResolution);
  assert.match(dashboard, /canPerform\(user, primaryBusiness\.id, "LOYALTY_EARN"\)/);
});
