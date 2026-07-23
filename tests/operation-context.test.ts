import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../generated/prisma/client";
import { resolveFinancialOperationContext } from "../lib/loyalty/operation-context";

type ContextOptions = {
  activeBranch?: boolean;
  activeBranchCount?: number;
  assigned?: boolean;
  attributionEnabled?: boolean;
  attributionRequired?: boolean;
  attributedStaffExists?: boolean;
  attributedStaffRole?: "OWNER" | "MANAGER" | "STAFF";
};

function createTransaction(options: ContextOptions = {}) {
  const {
    activeBranch = true,
    activeBranchCount = 1,
    assigned = true,
    attributionEnabled = true,
    attributionRequired = false,
    attributedStaffExists = true,
    attributedStaffRole = "STAFF",
  } = options;

  return {
    business: {
      findUnique: async () => ({
        staffAttributionEnabled: attributionEnabled,
        staffAttributionRequired: attributionRequired,
      }),
    },
    branch: {
      findFirst: async () => (activeBranch ? { id: "branch-1" } : null),
      count: async () => activeBranchCount,
    },
    branchStaffAssignment: {
      findFirst: async () => (assigned ? { id: "assignment-1" } : null),
    },
    user: {
      findFirst: async () =>
        attributedStaffExists
          ? { id: "staff-1", role: attributedStaffRole }
          : null,
    },
  } as unknown as Prisma.TransactionClient;
}

const staffActor = {
  id: "actor-staff",
  role: "STAFF" as const,
  businessId: "business-1",
};

test("staff may use an assigned active same-tenant branch", async () => {
  const result = await resolveFinancialOperationContext(createTransaction(), {
    businessId: "business-1",
    capability: "LOYALTY_EARN",
    actor: staffActor,
    branchId: "branch-1",
    attributedStaffId: "staff-1",
  });

  assert.deepEqual(result, {
    valid: true,
    branchId: "branch-1",
    createdById: "actor-staff",
    attributedStaffId: "staff-1",
  });
});

test("staff cannot use an unassigned, inactive, or wrong-tenant branch", async () => {
  const unassigned = await resolveFinancialOperationContext(
    createTransaction({ assigned: false }),
    {
      businessId: "business-1",
      capability: "LOYALTY_EARN",
      actor: staffActor,
      branchId: "branch-1",
    },
  );
  const inactiveOrOtherTenant = await resolveFinancialOperationContext(
    createTransaction({ activeBranch: false }),
    {
      businessId: "business-1",
      capability: "LOYALTY_EARN",
      actor: staffActor,
      branchId: "foreign-or-inactive-branch",
    },
  );

  assert.deepEqual(unassigned, {
    valid: false,
    reason: "INVALID_BRANCH_ASSIGNMENT",
  });
  assert.deepEqual(inactiveOrOtherTenant, {
    valid: false,
    reason: "INVALID_BRANCH",
  });
});

test("staff cannot omit a branch when the business has active branches", async () => {
  const result = await resolveFinancialOperationContext(createTransaction(), {
    businessId: "business-1",
    capability: "LOYALTY_REDEEM",
    actor: staffActor,
  });

  assert.deepEqual(result, {
    valid: false,
    reason: "BRANCH_REQUIRED_FOR_STAFF",
  });
});

test("legacy single-location staff operations remain branch-unassigned", async () => {
  const result = await resolveFinancialOperationContext(
    createTransaction({ activeBranchCount: 0 }),
    {
      businessId: "business-1",
      capability: "LOYALTY_REDEEM",
      actor: staffActor,
    },
  );

  assert.deepEqual(result, {
    valid: true,
    branchId: undefined,
    createdById: "actor-staff",
    attributedStaffId: undefined,
  });
});

test("required attribution rejects missing, wrong-tenant, and inactive staff", async () => {
  const missing = await resolveFinancialOperationContext(
    createTransaction({ attributionRequired: true }),
    {
      businessId: "business-1",
      capability: "LOYALTY_EARN",
      actor: { id: "owner-1", role: "OWNER", businessId: "business-1" },
      branchId: "branch-1",
    },
  );
  const invalid = await resolveFinancialOperationContext(
    createTransaction({ attributedStaffExists: false }),
    {
      businessId: "business-1",
      capability: "LOYALTY_EARN",
      actor: { id: "owner-1", role: "OWNER", businessId: "business-1" },
      branchId: "branch-1",
      attributedStaffId: "other-tenant-or-inactive-staff",
    },
  );

  assert.deepEqual(missing, { valid: false, reason: "ATTRIBUTION_REQUIRED" });
  assert.deepEqual(invalid, { valid: false, reason: "INVALID_STAFF" });
});

test("optional attribution and owner or manager branch operations remain allowed", async () => {
  const owner = await resolveFinancialOperationContext(createTransaction(), {
    businessId: "business-1",
    capability: "LOYALTY_ADJUST",
    actor: { id: "owner-1", role: "OWNER", businessId: "business-1" },
    branchId: "branch-1",
  });
  const manager = await resolveFinancialOperationContext(createTransaction(), {
    businessId: "business-1",
    capability: "LOYALTY_REDEEM",
    actor: { id: "manager-1", role: "MANAGER", businessId: "business-1" },
    branchId: "branch-1",
  });

  assert.equal(owner.valid, true);
  assert.equal(manager.valid, true);
});
