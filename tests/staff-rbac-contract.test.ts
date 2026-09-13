import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { canPerform } from "../lib/permissions";

const businessId = "business-a";
const otherBusinessId = "business-b";
const root = process.cwd();
const actionsSource = fs.readFileSync(
  path.join(root, "app/businesses/[slug]/users/actions.ts"),
  "utf8",
);

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

test("every staff-management mutation crosses the shared authorized server boundary", () => {
  assert.match(
    actionsSource,
    /canPerform\(\s*session\.user,\s*business\.id,\s*["']STAFF_MANAGE["']\s*\)/,
  );

  const exportedActions = [
    ...actionsSource.matchAll(/export async function\s+([A-Za-z0-9_]+)/g),
  ];
  const managementContextCalls = [
    ...actionsSource.matchAll(/await getManagementContext\(slug\)/g),
  ];

  assert.ok(exportedActions.length > 0);
  assert.equal(managementContextCalls.length, exportedActions.length);
});

test("staff target resolution remains tenant-scoped", () => {
  assert.match(
    actionsSource,
    /async function getTargetUser[\s\S]*?where:\s*\{\s*id:\s*userId,\s*businessId,/,
  );
  assert.match(
    actionsSource,
    /!isSuperAdmin\s*&&\s*targetUser\.role\s*===\s*["']OWNER["']/,
  );
});
