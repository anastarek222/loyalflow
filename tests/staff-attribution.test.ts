import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../generated/prisma/client";
import { validateStaffAttribution } from "../lib/loyalty/staff-attribution";

type MockOptions = {
  enabled?: boolean;
  required?: boolean;
  businessExists?: boolean;
  staffExists?: boolean;
  staffId?: string;
  branchAssigned?: boolean;
};

function createTransaction(options: MockOptions = {}) {
  const {
    enabled = false,
    required = false,
    businessExists = true,
    staffExists = true,
    staffId = "staff-1",
    branchAssigned = true,
  } = options;

  const transaction = {
    business: {
      findUnique: async () =>
        businessExists
          ? {
              staffAttributionEnabled: enabled,
              staffAttributionRequired: required,
            }
          : null,
    },

    user: {
      findFirst: async () => (staffExists ? { id: staffId, role: "STAFF" } : null),
    },

    branchStaffAssignment: {
      findFirst: async () => (branchAssigned ? { id: "assignment-1" } : null),
    },
  } as unknown as Prisma.TransactionClient;

  return transaction;
}

test("disabled attribution ignores supplied staff and remains unattributed", async () => {
  const transaction = createTransaction({
    enabled: false,
    required: false,
  });

  const result = await validateStaffAttribution(transaction, {
    businessId: "business-1",
    attributedStaffId: "staff-1",
  });

  assert.deepEqual(result, {
    valid: true,
    attributedStaffId: null,
  });
});

test("enabled optional attribution accepts missing staff", async () => {
  const transaction = createTransaction({
    enabled: true,
    required: false,
  });

  const result = await validateStaffAttribution(transaction, {
    businessId: "business-1",
  });

  assert.deepEqual(result, {
    valid: true,
    attributedStaffId: null,
  });
});

test("enabled required attribution rejects missing staff", async () => {
  const transaction = createTransaction({
    enabled: true,
    required: true,
  });

  const result = await validateStaffAttribution(transaction, {
    businessId: "business-1",
  });

  assert.deepEqual(result, {
    valid: false,
    reason: "ATTRIBUTION_REQUIRED",
  });
});

test("valid same-business active eligible staff is accepted", async () => {
  const transaction = createTransaction({
    enabled: true,
    required: true,
    staffExists: true,
    staffId: "staff-1",
  });

  const result = await validateStaffAttribution(transaction, {
    businessId: "business-1",
    attributedStaffId: "staff-1",
  });

  assert.deepEqual(result, {
    valid: true,
    attributedStaffId: "staff-1",
  });
});

test("invalid inactive wrong-tenant or ineligible staff is rejected", async () => {
  const transaction = createTransaction({
    enabled: true,
    required: true,
    staffExists: false,
  });

  const result = await validateStaffAttribution(transaction, {
    businessId: "business-1",
    attributedStaffId: "invalid-staff",
  });

  assert.deepEqual(result, {
    valid: false,
    reason: "INVALID_STAFF",
  });
});

test("staff without required branch assignment is rejected", async () => {
  const transaction = createTransaction({
    enabled: true,
    required: true,
    staffExists: true,
    branchAssigned: false,
  });

  const result = await validateStaffAttribution(transaction, {
    businessId: "business-1",
    branchId: "branch-1",
    attributedStaffId: "staff-1",
  });

  assert.deepEqual(result, {
    valid: false,
    reason: "INVALID_BRANCH_ASSIGNMENT",
  });
});

test("staff with matching branch assignment is accepted", async () => {
  const transaction = createTransaction({
    enabled: true,
    required: true,
    staffExists: true,
    staffId: "staff-1",
    branchAssigned: true,
  });

  const result = await validateStaffAttribution(transaction, {
    businessId: "business-1",
    branchId: "branch-1",
    attributedStaffId: "staff-1",
  });

  assert.deepEqual(result, {
    valid: true,
    attributedStaffId: "staff-1",
  });
});

test("missing business rejects attribution safely", async () => {
  const transaction = createTransaction({
    businessExists: false,
  });

  const result = await validateStaffAttribution(transaction, {
    businessId: "missing-business",
    attributedStaffId: "staff-1",
  });

  assert.deepEqual(result, {
    valid: false,
    reason: "INVALID_STAFF",
  });
});
