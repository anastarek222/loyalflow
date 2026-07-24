import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getAdministrationNavigation } from "@/lib/administration/navigation";
import { getBranchAssignmentEligibility, getBranchCount } from "@/lib/branches/management";
import { resolveExperienceAccess, resolveExperienceMode } from "@/lib/experience-mode";
import { canPerform } from "@/lib/permissions";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const businessA = "business-a";
const businessB = "business-b";

test("U10 keeps the canonical slug-preserving administration routes and shared navigation", () => {
  for (const route of ["settings", "users", "branches", "playbooks"]) assert.equal(existsSync(join(root, `app/businesses/[slug]/${route}/page.tsx`)), true);
  const nav = getAdministrationNavigation({ role: "OWNER", businessId: businessA }, businessA, "north-star", "EN");
  assert.deepEqual(nav.map((item) => item.href), ["/businesses/north-star/settings", "/businesses/north-star/users", "/businesses/north-star/branches", "/businesses/north-star/playbooks"]);
  assert.equal(getAdministrationNavigation({ role: "MANAGER", businessId: businessA }, businessA, "north-star").length, 0);
  assert.match(source("components/administration/administration-navigation.tsx"), /aria-current/);
  assert.match(source("components/administration/administration-navigation.tsx"), /overflow-x-auto/);
});

test("U10 presentation access never expands authorization and all three policies remain separate", () => {
  const staff = { role: "STAFF" as const, businessId: businessA };
  assert.equal(resolveExperienceMode("ADVANCED", staff.role, "ADVANCED_ONLY"), "ADVANCED");
  assert.equal(canPerform(staff, businessA, "SETTINGS_EDIT"), false);
  assert.equal(canPerform(staff, businessB, "CUSTOMERS_VIEW"), false);
  assert.deepEqual(["SIMPLE_ONLY", "ADVANCED_ONLY", "BOTH"].map((access) => resolveExperienceAccess("STAFF", access)), ["SIMPLE_ONLY", "ADVANCED_ONLY", "BOTH"]);
  assert.equal(resolveExperienceAccess("OWNER", "SIMPLE_ONLY"), "BOTH");
  assert.equal(resolveExperienceAccess("SUPER_ADMIN", "ADVANCED_ONLY"), "BOTH");
  assert.doesNotMatch(source("lib/branches/management.ts"), /experienceAccess/);
});

test("U10 server actions retain tenant-scoped team and branch safeguards", () => {
  const teamActions = source("app/businesses/[slug]/users/actions.ts");
  const branchActions = source("app/businesses/[slug]/branches/actions.ts");
  assert.match(teamActions, /canPerform\(session\.user, business\.id, "STAFF_MANAGE"\)/);
  assert.match(teamActions, /where:\s*\{\s*id: userId,\s*businessId/);
  assert.match(teamActions, /!isBusinessOwner && !isSuperAdmin/);
  assert.match(branchActions, /getTenantScopedBranchWhere/);
  assert.match(branchActions, /getBranchAssignmentEligibility/);
  assert.match(branchActions, /isDuplicateBranchAssignmentError/);
  assert.equal(getBranchAssignmentEligibility({ businessId: businessA, branch: { businessId: businessA, isActive: false }, user: { businessId: businessA, isActive: true, role: "STAFF" } }), "INACTIVE_BRANCH");
  assert.equal(getBranchAssignmentEligibility({ businessId: businessA, branch: { businessId: businessA, isActive: true }, user: { businessId: businessB, isActive: true, role: "STAFF" } }), "CROSS_TENANT_USER");
  assert.equal(getBranchCount([{ id: 1 }, { id: 2 }]), 2);
});

test("U10 preserves canonical profile, loyalty, branding, enrollment, and playbook contracts", () => {
  const settingsActions = source("app/businesses/[slug]/settings/actions.ts");
  const settings = source("app/businesses/[slug]/settings/page.tsx");
  const playbookActions = source("app/businesses/[slug]/playbooks/actions.ts");
  assert.match(settingsActions, /isSupportedCurrency/);
  assert.match(settingsActions, /isValidIanaTimezone/);
  assert.doesNotMatch(settingsActions, /slug:\s*parsed/);
  assert.match(settingsActions, /qrStyle:\s*parsed\.data\.qrStyle/);
  assert.match(settingsActions, /qrPosition:\s*parsed\.data\.qrPosition/);
  assert.match(settings, /\/join\/\$\{business\.slug\}/);
  assert.match(playbookActions, /canManageBusiness/);
  assert.match(playbookActions, /confirmedExisting/);
  assert.match(playbookActions, /playbookMatchesBusiness/);
  assert.doesNotMatch(playbookActions, /transaction\.create/);
});

test("U10 provides bilingual RTL/LTR foundations without a migration dependency", () => {
  const nav = source("lib/administration/navigation.ts");
  assert.match(nav, /Business settings/);
  assert.match(nav, /إعدادات النشاط/);
  assert.match(source("components/administration/administration-navigation.tsx"), /dir=\{language === "AR" \? "rtl" : "ltr"\}/);
  assert.equal(existsSync(join(root, "prisma/migrations/u10")), false);
  assert.equal(existsSync(join(root, "prisma/migrations/U10")), false);
});
