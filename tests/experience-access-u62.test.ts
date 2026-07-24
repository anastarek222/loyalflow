import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  EXPERIENCE_ACCESS_DEFAULTS,
  getExperienceNavigationRules,
  resolveExperienceAccess,
  resolveExperienceMode,
} from "../lib/experience-mode";
import { canPerform } from "../lib/permissions";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const businessA = "business-a";
const businessB = "business-b";

test("U6.2 clamps an Advanced cookie to Simple only", () => {
  assert.equal(resolveExperienceMode("ADVANCED", "STAFF", "SIMPLE_ONLY"), "SIMPLE");
});

test("U6.2 clamps a Simple cookie to Advanced only", () => {
  assert.equal(resolveExperienceMode("SIMPLE", "MANAGER", "ADVANCED_ONLY"), "ADVANCED");
});

test("U6.2 honors a valid preference for Both and has deterministic fallbacks", () => {
  assert.equal(resolveExperienceMode("ADVANCED", "MANAGER", "BOTH"), "ADVANCED");
  assert.equal(resolveExperienceMode(undefined, "MANAGER", "BOTH"), "ADVANCED");
  assert.equal(resolveExperienceMode("tampered", "OWNER", "BOTH"), "SIMPLE");
});

test("U6.2 defaults only new accounts by role while preserving existing access in migration", () => {
  assert.deepEqual(EXPERIENCE_ACCESS_DEFAULTS, {
    OWNER: "BOTH",
    MANAGER: "BOTH",
    STAFF: "SIMPLE_ONLY",
    VIEWER: "SIMPLE_ONLY",
    SUPER_ADMIN: "BOTH",
  });
  const migration = source("prisma/migrations/20260724090000_add_experience_access/migration.sql");
  assert.match(migration, /DEFAULT 'BOTH'/);
  assert.match(migration, /ADD COLUMN "experienceAccess"/);
});

test("U6.2 never lets owner or super-admin access be restricted", () => {
  assert.equal(resolveExperienceAccess("OWNER", "SIMPLE_ONLY"), "BOTH");
  assert.equal(resolveExperienceAccess("SUPER_ADMIN", "ADVANCED_ONLY"), "BOTH");
  assert.equal(resolveExperienceMode("ADVANCED", "OWNER", "SIMPLE_ONLY"), "ADVANCED");
});

test("U6.2 only exposes the mode switcher to a meaningful Both experience", () => {
  assert.equal(getExperienceNavigationRules({ mode: "SIMPLE", role: "STAFF", access: "SIMPLE_ONLY", advancedDestinationCount: 3 }).showModeSwitcher, false);
  assert.equal(getExperienceNavigationRules({ mode: "ADVANCED", role: "MANAGER", access: "ADVANCED_ONLY", advancedDestinationCount: 3 }).showModeSwitcher, false);
  assert.equal(getExperienceNavigationRules({ mode: "SIMPLE", role: "MANAGER", access: "BOTH", advancedDestinationCount: 1 }).showModeSwitcher, true);
});

test("U6.2 preserves permission boundaries in Advanced presentation", () => {
  const staff = { role: "STAFF" as const, businessId: businessA };
  assert.equal(resolveExperienceMode("ADVANCED", staff.role, "ADVANCED_ONLY"), "ADVANCED");
  assert.equal(canPerform(staff, businessA, "REPORTS_VIEW"), false);
  assert.equal(canPerform(staff, businessA, "STAFF_MANAGE"), false);
  assert.equal(canPerform(staff, businessA, "SETTINGS_EDIT"), false);
});

test("U6.2 does not allow access policy to grant a cross-business capability", () => {
  const manager = { role: "MANAGER" as const, businessId: businessA };
  assert.equal(resolveExperienceMode("ADVANCED", manager.role, "BOTH"), "ADVANCED");
  assert.equal(canPerform(manager, businessB, "CUSTOMERS_VIEW"), false);
});

test("U6.2 resolution is isolated per business-scoped account policy", () => {
  const preference = "ADVANCED";
  assert.equal(resolveExperienceMode(preference, "MANAGER", "SIMPLE_ONLY"), "SIMPLE");
  assert.equal(resolveExperienceMode(preference, "MANAGER", "BOTH"), "ADVANCED");
  assert.match(source("prisma/schema.prisma"), /businessId\s+String\?/);
  assert.doesNotMatch(source("prisma/schema.prisma"), /model\s+(BusinessUser|TeamMember|Membership)/);
});

test("U6.2 team creation and editing persist the selected policy through server-authorized actions", () => {
  const actions = source("app/businesses/[slug]/users/actions.ts");
  assert.match(actions, /experienceAccess:\s*resolveExperienceAccess/);
  assert.match(actions, /updateBusinessUserExperienceAccessAction/);
  assert.match(actions, /where:\s*\{\s*id: userId,\s*businessId/);
  assert.match(actions, /!isBusinessOwner && !isSuperAdmin/);
  assert.match(actions, /type: "USER_EXPERIENCE_ACCESS_UPDATED"/);
});

test("U6.2 leaves branch assignments unrelated to experience access", () => {
  const schema = source("prisma/schema.prisma");
  assert.match(schema, /model BranchStaffAssignment[\s\S]*?userId/);
  assert.doesNotMatch(schema.match(/model BranchStaffAssignment[\s\S]*?\n}\n/)?.[0] ?? "", /experienceAccess/);
});

test("U6.2 localizes team controls and keeps the cookie as a preference", () => {
  const page = source("app/businesses/[slug]/users/page.tsx");
  const action = source("app/experience-mode/actions.ts");
  assert.match(page, /الوضع البسيط فقط/);
  assert.match(page, /Simple only/);
  assert.match(page, /aria-describedby/);
  assert.match(page, /normalizeLanguage/);
  assert.match(action, /httpOnly: true/);
  assert.doesNotMatch(action, /experienceAccess/);
});
