import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const team = source("app/businesses/[slug]/users/page.tsx");
const teamActions = source("app/businesses/[slug]/users/actions.ts");
const branches = source("app/businesses/[slug]/branches/page.tsx");
const branchActions = source("app/businesses/[slug]/branches/actions.ts");
const branchCreationCommand = source(
  "lib/server/business/branch-creation-command.ts",
);
const branchMaintenanceCommand = source(
  "lib/server/business/branch-maintenance-command.ts",
);
const branchStaffCommand = source(
  "lib/server/business/branch-staff-assignment-command.ts",
);

test("T006 Team workspace preserves tenant capability, filtering, and pagination", () => {
  assert.match(
    team,
    /canPerform\(session\.user, business\.id, "STAFF_MANAGE"\)/,
  );
  assert.match(team, /businessId: business\.id/);
  assert.match(team, /const USERS_PER_PAGE = 10/);
  assert.match(team, /skip: \(currentPage - 1\) \* USERS_PER_PAGE/);
  assert.match(team, /take: USERS_PER_PAGE/);
  assert.match(team, /firstName:[\s\S]{0,80}contains: search/);
  assert.match(team, /email:[\s\S]{0,80}contains: search/);
  assert.match(team, /role: selectedRole/);
  assert.doesNotMatch(
    team,
    /prisma\.user\.(?:create|update|delete)|prisma\.\$transaction/,
  );
});

test("T006 Team presentation retains canonical account writers and protected controls", () => {
  assert.match(team, /createBusinessUserAction\.bind\(null, business\.slug\)/);
  assert.match(
    team,
    /setBusinessUserStatusAction\.bind\([\s\S]{0,120}business\.slug,[\s\S]{0,80}user\.id,[\s\S]{0,80}!user\.isActive/,
  );
  assert.match(
    team,
    /resetBusinessUserPasswordAction\.bind\([\s\S]{0,120}business\.slug,[\s\S]{0,80}user\.id/,
  );
  assert.match(
    team,
    /updateBusinessUserExperienceAccessAction\.bind\([\s\S]{0,140}business\.slug,[\s\S]{0,80}user\.id/,
  );
  assert.match(team, /<ConfirmSubmitButton/);
  assert.match(team, /!isCurrentUser/);
  assert.match(team, /user\.role !== "OWNER"/);
});

test("T006 Team mutations retain plan limits, tenant targets, audit records, and session invalidation", () => {
  assert.match(
    teamActions,
    /canPerform\(session\.user, business\.id, "STAFF_MANAGE"\)/,
  );
  assert.match(teamActions, /isWithinPlanLimit\(/);
  assert.match(teamActions, /businessId: business\.id/);
  assert.match(teamActions, /getTargetUser\(business\.id/);
  assert.match(teamActions, /resolveExperienceAccess\(/);
  assert.match(teamActions, /businessActivity\.create/);
  assert.match(teamActions, /authVersion/);
  assert.match(teamActions, /hash\(/);
});

test("T006 Branch workspace preserves tenant queries and canonical assignment actions", () => {
  assert.match(branches, /canManageBranches\(session\.user, business\.id\)/);
  assert.match(
    branches,
    /prisma\.branch\.findMany\([\s\S]{0,100}businessId: business\.id/,
  );
  assert.match(
    branches,
    /prisma\.user\.findMany\([\s\S]{0,120}businessId: business\.id,[\s\S]{0,80}isActive: true,[\s\S]{0,80}role: "STAFF"/,
  );
  for (const action of [
    "createBranchAction",
    "updateBranchAction",
    "setBranchStatusAction",
    "assignStaffToBranchAction",
    "removeStaffAssignmentAction",
  ]) {
    assert.match(branches, new RegExp(`${action}\\.bind\\(`));
  }
  assert.match(branches, /<ConfirmSubmitButton/);
});

test("T006 Branch mutations retain plan, tenant, eligibility, and audit safeguards", () => {
  assert.match(
    branchActions,
    /canManageBranches\(session\.user, business\.id\)/,
  );
  assert.match(branchActions, /isWithinPlanLimit\(/);
  assert.match(branchActions, /createBranchCommand/);
  assert.match(branchActions, /updateBranchCommand/);
  assert.match(branchActions, /setBranchStatusCommand/);
  assert.match(branchActions, /assignStaffToBranchCommand/);
  assert.match(branchActions, /removeStaffAssignmentCommand/);
  assert.match(branchCreationCommand, /transaction\.branch\.count/);
  assert.match(branchCreationCommand, /transaction\.businessActivity\.create/);
  assert.match(branchMaintenanceCommand, /getTenantScopedBranchWhere\(/);
  assert.match(branchMaintenanceCommand, /transaction\.businessActivity\.create/);
  assert.match(branchStaffCommand, /getTenantScopedBranchWhere\(/);
  assert.match(branchStaffCommand, /getTenantScopedAssignmentWhere\(/);
  assert.match(branchStaffCommand, /getBranchAssignmentEligibility\(/);
  assert.match(branchStaffCommand, /eligibility !== "ELIGIBLE"/);
  assert.match(branchStaffCommand, /buildBranchAuditActivity\(/);
  assert.match(branchStaffCommand, /transaction\.branchStaffAssignment\.create/);
  assert.match(branchStaffCommand, /transaction\.branchStaffAssignment\.delete/);
});

test("T006 Team and Branches expose one refreshed administration workspace", () => {
  assert.match(team, /data-team-administration="true"/);
  assert.match(team, /data-team-filters="true"/);
  assert.match(team, /data-team-member="true"/);
  assert.match(branches, /data-branches-administration="true"/);
  assert.match(branches, /data-branch-card="true"/);
  assert.doesNotMatch(team, /AdministrationNavigation/);
  assert.doesNotMatch(branches, /AdministrationNavigation/);
  assert.doesNotMatch(
    `${team}\n${branches}`,
    /fetch\(|localStorage|sessionStorage/,
  );
});
