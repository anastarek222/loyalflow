import assert from "node:assert/strict";
import test from "node:test";

import {
  capabilities,
  canAccessBusiness,
  canExportBusinessData,
  canManageBusiness,
  canPerform,
  isBusinessOwner,
  isSuperAdmin,
} from "../lib/permissions";

const businessA = "business-a";
const businessB = "business-b";

test("super admins can access and manage every business", () => {
  const user = { role: "SUPER_ADMIN" as const, businessId: null };

  assert.equal(canAccessBusiness(user, businessA), true);
  assert.equal(canManageBusiness(user, businessB), true);
  assert.equal(isSuperAdmin(user), true);
  assert.equal(canExportBusinessData(user, businessB, false), true);
});

test("owners are limited to their own business", () => {
  const user = { role: "OWNER" as const, businessId: businessA };

  assert.equal(canAccessBusiness(user, businessA), true);
  assert.equal(canManageBusiness(user, businessA), true);
  assert.equal(canAccessBusiness(user, businessB), false);
  assert.equal(canManageBusiness(user, businessB), false);
  assert.equal(isBusinessOwner(user, businessA), true);
  assert.equal(canExportBusinessData(user, businessA, true), true);
  assert.equal(canExportBusinessData(user, businessA, false), false);
  for (const capability of capabilities) {
    assert.equal(canPerform(user, businessA, capability), true);
  }
});

test("managers can operate customer, loyalty, and report capabilities but not team or settings", () => {
  const user = { role: "MANAGER" as const, businessId: businessA };

  assert.equal(canPerform(user, businessA, "CUSTOMERS_VIEW"), true);
  assert.equal(canPerform(user, businessA, "CUSTOMERS_EDIT"), true);
  assert.equal(canPerform(user, businessA, "LOYALTY_ADJUST"), true);
  assert.equal(canPerform(user, businessA, "REPORTS_VIEW"), true);
  assert.equal(canPerform(user, businessA, "STAFF_MANAGE"), false);
  assert.equal(canPerform(user, businessA, "SETTINGS_EDIT"), false);
  assert.equal(canPerform(user, businessB, "LOYALTY_EARN"), false);
});

test("staff are cashier-equivalent and cannot edit customers, adjust, or view reports", () => {
  const user = { role: "STAFF" as const, businessId: businessA };

  assert.equal(canAccessBusiness(user, businessA), true);
  assert.equal(canPerform(user, businessA, "LOYALTY_EARN"), true);
  assert.equal(canPerform(user, businessA, "LOYALTY_REDEEM"), true);
  assert.equal(canPerform(user, businessA, "CUSTOMERS_EDIT"), false);
  assert.equal(canPerform(user, businessA, "LOYALTY_ADJUST"), false);
  assert.equal(canPerform(user, businessA, "REPORTS_VIEW"), false);
  assert.equal(canManageBusiness(user, businessA), false);
  assert.equal(canAccessBusiness(user, businessB), false);
  assert.equal(canExportBusinessData(user, businessA, true), false);
});

test("viewers are tenant-scoped read-only users", () => {
  const user = { role: "VIEWER" as const, businessId: businessA };

  assert.equal(canAccessBusiness(user, businessA), true);
  assert.equal(canPerform(user, businessA, "REPORTS_VIEW"), true);
  assert.equal(canPerform(user, businessA, "LOYALTY_EARN"), false);
  assert.equal(canPerform(user, businessA, "CUSTOMERS_EDIT"), false);
  assert.equal(canAccessBusiness(user, businessB), false);
});

test("cross-tenant users have no capability regardless of role", () => {
  const owner = { role: "OWNER" as const, businessId: businessA };
  const manager = { role: "MANAGER" as const, businessId: businessA };

  assert.equal(canPerform(owner, businessB, "SETTINGS_EDIT"), false);
  assert.equal(canPerform(manager, businessB, "CUSTOMERS_VIEW"), false);
});
