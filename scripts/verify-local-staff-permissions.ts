import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { canPerform } from "../lib/permissions";
import { logServerError } from "../lib/server/logging";

const EXPECTED_MIGRATION = "20260720230000_add_manager_and_viewer_roles";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const runId = randomUUID().replaceAll("-", "").slice(0, 10);
const businessIds: string[] = [];

async function cleanup() {
  for (const businessId of businessIds) {
    await prisma.business.delete({ where: { id: businessId } }).catch(() => null);
  }
}

async function main() {
  const identity = await prisma.$queryRaw<Array<{ database: string }>>
    `SELECT current_database() AS database`;
  assert.equal(identity[0]?.database, "loyalflow_test", "Refusing to run outside loyalflow_test.");
  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${EXPECTED_MIGRATION} AND finished_at IS NOT NULL`;
  assert.equal(applied.length, 1, "Apply the reviewed staff-role migration before running this verifier.");

  const [business, otherBusiness] = await Promise.all([
    prisma.business.create({ data: { name: "Permissions verification", slug: `lf-verify-permissions-${runId}` } }),
    prisma.business.create({ data: { name: "Permissions other tenant", slug: `lf-verify-permissions-other-${runId}` } }),
  ]);
  businessIds.push(business.id, otherBusiness.id);
  const [manager, cashier, viewer] = await Promise.all([
    prisma.user.create({ data: { firstName: "Manager", email: `lf-verify-manager-${runId}@example.test`, passwordHash: "verification-only", role: "MANAGER", businessId: business.id } }),
    prisma.user.create({ data: { firstName: "Cashier", email: `lf-verify-cashier-${runId}@example.test`, passwordHash: "verification-only", role: "STAFF", businessId: business.id } }),
    prisma.user.create({ data: { firstName: "Viewer", email: `lf-verify-viewer-${runId}@example.test`, passwordHash: "verification-only", role: "VIEWER", businessId: business.id } }),
  ]);
  assert.equal(canPerform(manager, business.id, "LOYALTY_ADJUST"), true);
  assert.equal(canPerform(manager, business.id, "STAFF_MANAGE"), false);
  assert.equal(canPerform(cashier, business.id, "LOYALTY_EARN"), true);
  assert.equal(canPerform(cashier, business.id, "CUSTOMERS_EDIT"), false);
  assert.equal(canPerform(viewer, business.id, "CUSTOMERS_VIEW"), true);
  assert.equal(canPerform(viewer, business.id, "REPORTS_VIEW"), true);
  assert.equal(canPerform(viewer, business.id, "LOYALTY_REDEEM"), false);
  assert.equal(canPerform(manager, otherBusiness.id, "CUSTOMERS_VIEW"), false);
  assert.equal(await prisma.user.count({ where: { businessId: business.id, role: { in: ["MANAGER", "STAFF", "VIEWER"] } } }), 3);
  console.log("PASS: loyalflow_test staff-role migration and isolated permission verification completed.");
}

main()
  .catch((error) => {
    logServerError("staff_permissions_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
