import assert from "node:assert/strict";
import test from "node:test";

import {
  branchInputSchema,
  canManageBranches,
  getBranchAssignmentEligibility,
  getBranchCount,
  getTenantScopedAssignmentWhere,
  getTenantScopedBranchWhere,
  isDuplicateBranchAssignmentError,
  normalizeBranchInput,
} from "@/lib/branches/management";
import { canWriteAtBranch } from "@/lib/branches/access";

const businessA = "business-a";
const businessB = "business-b";
const activeBranch = { businessId: businessA, isActive: true };

test("owners can create, update, and deactivate same-tenant branch inputs", () => {
  const owner = { role: "OWNER" as const, businessId: businessA };
  const parsed = branchInputSchema.safeParse({ name: "  Downtown  ", address: "  Cairo  ", contactPhone: " +201000000000 " });

  assert.equal(canManageBranches(owner, businessA), true);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.deepEqual(normalizeBranchInput(parsed.data), {
      name: "Downtown",
      address: "Cairo",
      contactPhone: "+201000000000",
    });
  }
  assert.equal(canWriteAtBranch({ user: owner, businessId: businessA, branch: { id: "branch-a", ...activeBranch, isActive: false }, capability: "LOYALTY_ADJUST" }), false);
});

test("cross-tenant branch mutations and assignments are rejected", () => {
  const owner = { role: "OWNER" as const, businessId: businessA };

  assert.equal(canManageBranches(owner, businessB), false);
  assert.deepEqual(getTenantScopedBranchWhere("branch-a", businessA), {
    id: "branch-a",
    businessId: businessA,
  });
  assert.equal(getBranchAssignmentEligibility({ businessId: businessA, branch: { businessId: businessB, isActive: true }, user: { businessId: businessA, isActive: true, role: "STAFF" } }), "CROSS_TENANT_BRANCH");
});

test("staff and viewers cannot manage branches", () => {
  assert.equal(canManageBranches({ role: "STAFF", businessId: businessA }, businessA), false);
  assert.equal(canManageBranches({ role: "VIEWER", businessId: businessA }, businessA), false);
});

test("a valid active same-tenant staff assignment is eligible", () => {
  assert.equal(getBranchAssignmentEligibility({ businessId: businessA, branch: activeBranch, user: { businessId: businessA, isActive: true, role: "STAFF" } }), "ELIGIBLE");
});

test("duplicate branch assignments are safely recognized", () => {
  assert.equal(isDuplicateBranchAssignmentError({ code: "P2002" }), true);
  assert.equal(isDuplicateBranchAssignmentError({ code: "P2025" }), false);
});

test("inactive, cross-tenant, and non-staff users cannot be assigned", () => {
  assert.equal(getBranchAssignmentEligibility({ businessId: businessA, branch: activeBranch, user: { businessId: businessA, isActive: false, role: "STAFF" } }), "INACTIVE_USER");
  assert.equal(getBranchAssignmentEligibility({ businessId: businessA, branch: activeBranch, user: { businessId: businessB, isActive: true, role: "STAFF" } }), "CROSS_TENANT_USER");
  assert.equal(getBranchAssignmentEligibility({ businessId: businessA, branch: activeBranch, user: { businessId: businessA, isActive: true, role: "VIEWER" } }), "INELIGIBLE_ROLE");
});

test("inactive branches cannot accept new staff assignments", () => {
  assert.equal(getBranchAssignmentEligibility({ businessId: businessA, branch: { businessId: businessA, isActive: false }, user: { businessId: businessA, isActive: true, role: "STAFF" } }), "INACTIVE_BRANCH");
});

test("removing an assignment is limited to its business", () => {
  assert.deepEqual(getTenantScopedAssignmentWhere("assignment-a", businessA), {
    id: "assignment-a",
    businessId: businessA,
  });
});

test("inactive branches remain unusable for loyalty operations", () => {
  const staff = { role: "STAFF" as const, businessId: businessA };
  assert.equal(canWriteAtBranch({ user: staff, businessId: businessA, branch: { ...activeBranch, id: "branch-a", isActive: false }, assignedBranchIds: ["branch-a"], capability: "LOYALTY_EARN" }), false);
});

test("branch count is derived from Branch records rather than persisted", () => {
  assert.equal(getBranchCount([{ id: "branch-a" }, { id: "branch-b" }]), 2);
});
