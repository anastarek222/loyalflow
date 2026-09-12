import assert from "node:assert/strict";
import test from "node:test";

import { canPerform } from "../lib/permissions";

const businessId = "business-a";
const otherBusinessId = "business-b";

test("staff-management authority is owner-only within the tenant", () => {
  assert.equal(
    canPerform({ role: "OWNER", businessId }, businessId, "STAFF_MANAGE"),
    true,
  );
  assert.equal(
    canPerform({ role: "MANAGER", businessId }, businessId, "STAFF_MANAGE"),
    false,
  );
  assert.equal(
    canPerform({ role: "STAFF", businessId }, businessId, "STAFF_MANAGE"),
    false,
  );
  assert.equal(
    canPerform({ role: "VIEWER", businessId }, businessId, "STAFF_MANAGE"),
    false,
  );
});

test("tenant-scoped capabilities reject cross-business access", () => {
  assert.equal(
    canPerform(
      { role: "OWNER", businessId: otherBusinessId },
      businessId,
      "STAFF_MANAGE",
    ),
    false,
  );
  assert.equal(
    canPerform(
      { role: "MANAGER", businessId: otherBusinessId },
      businessId,
      "CUSTOMERS_VIEW",
    ),
    false,
  );
});

test("super admin retains explicit cross-tenant authority", () => {
  assert.equal(
    canPerform(
      { role: "SUPER_ADMIN", businessId: null },
      businessId,
      "STAFF_MANAGE",
    ),
    true,
  );
});

test("cashier and viewer daily-operation capabilities stay intentionally narrow", () => {
  assert.equal(
    canPerform({ role: "STAFF", businessId }, businessId, "LOYALTY_EARN"),
    true,
  );
  assert.equal(
    canPerform({ role: "STAFF", businessId }, businessId, "LOYALTY_REDEEM"),
    true,
  );
  assert.equal(
    canPerform({ role: "STAFF", businessId }, businessId, "CUSTOMERS_EDIT"),
    false,
  );
  assert.equal(
    canPerform({ role: "VIEWER", businessId }, businessId, "CUSTOMERS_VIEW"),
    true,
  );
  assert.equal(
    canPerform({ role: "VIEWER", businessId }, businessId, "REPORTS_VIEW"),
    true,
  );
  assert.equal(
    canPerform({ role: "VIEWER", businessId }, businessId, "LOYALTY_EARN"),
    false,
  );
});
