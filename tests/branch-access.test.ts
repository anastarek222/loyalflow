import assert from "node:assert/strict";
import test from "node:test";

import {
  branchReportFilter,
  canAccessBranch,
  canWriteAtBranch,
} from "../lib/branches/access";

const businessA = "business-a";
const businessB = "business-b";
const activeBranchA = { id: "branch-a", businessId: businessA, isActive: true };
const inactiveBranchA = { ...activeBranchA, id: "branch-a-inactive", isActive: false };
const branchB = { id: "branch-b", businessId: businessB, isActive: true };

test("owners and managers can access branches in their tenant", () => {
  const owner = { role: "OWNER" as const, businessId: businessA };
  const manager = { role: "MANAGER" as const, businessId: businessA };

  assert.equal(canAccessBranch({ user: owner, businessId: businessA, branch: activeBranchA }), true);
  assert.equal(canAccessBranch({ user: manager, businessId: businessA, branch: activeBranchA }), true);
  assert.equal(canWriteAtBranch({ user: owner, businessId: businessA, branch: activeBranchA, capability: "LOYALTY_ADJUST" }), true);
  assert.equal(canWriteAtBranch({ user: manager, businessId: businessA, branch: activeBranchA, capability: "LOYALTY_EARN" }), true);
});

test("staff require an explicit same-tenant branch assignment for loyalty writes", () => {
  const cashier = { role: "STAFF" as const, businessId: businessA };

  assert.equal(canAccessBranch({ user: cashier, businessId: businessA, branch: activeBranchA }), false);
  assert.equal(canWriteAtBranch({ user: cashier, businessId: businessA, branch: activeBranchA, capability: "LOYALTY_EARN" }), false);
  assert.equal(canWriteAtBranch({ user: cashier, businessId: businessA, branch: activeBranchA, assignedBranchIds: [activeBranchA.id], capability: "LOYALTY_EARN" }), true);
});

test("viewers can inspect tenant branches but cannot write and inactive branches reject writes", () => {
  const viewer = { role: "VIEWER" as const, businessId: businessA };
  const owner = { role: "OWNER" as const, businessId: businessA };

  assert.equal(canAccessBranch({ user: viewer, businessId: businessA, branch: activeBranchA }), true);
  assert.equal(canWriteAtBranch({ user: viewer, businessId: businessA, branch: activeBranchA, capability: "LOYALTY_EARN" }), false);
  assert.equal(canWriteAtBranch({ user: owner, businessId: businessA, branch: inactiveBranchA, capability: "LOYALTY_EARN" }), false);
});

test("cross-tenant branches are inaccessible even when an ID is supplied", () => {
  const owner = { role: "OWNER" as const, businessId: businessA };
  const superAdmin = { role: "SUPER_ADMIN" as const, businessId: null };

  assert.equal(canAccessBranch({ user: owner, businessId: businessA, branch: branchB }), false);
  assert.equal(canWriteAtBranch({ user: owner, businessId: businessA, branch: branchB, capability: "LOYALTY_EARN" }), false);
  assert.equal(canAccessBranch({ user: superAdmin, businessId: businessA, branch: branchB }), false);
});

test("branch report filters are optional so historic unassigned data remains in business totals", () => {
  assert.deepEqual(branchReportFilter(), {});
  assert.deepEqual(branchReportFilter(activeBranchA.id), { branchId: activeBranchA.id });
});
