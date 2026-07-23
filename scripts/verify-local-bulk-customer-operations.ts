import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { getBulkStateChangeIds } from "../lib/customers/bulk";
import { logServerError } from "../lib/server/logging";

const connectionString = process.env.DATABASE_URL;
const REQUIRED_MIGRATION = "20260720250000_add_customer_notes_and_tags";
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
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${REQUIRED_MIGRATION} AND finished_at IS NOT NULL`;
  assert.equal(applied.length, 1, "The current notes/tags schema must be applied before bulk verification.");

  const [business, otherBusiness] = await Promise.all([
    prisma.business.create({ data: { name: "Bulk verification", slug: `lf-verify-bulk-${runId}` } }),
    prisma.business.create({ data: { name: "Bulk other tenant", slug: `lf-verify-bulk-other-${runId}` } }),
  ]);
  businessIds.push(business.id, otherBusiness.id);

  const [owner, activeCustomer, inactiveCustomer, otherCustomer, tag, otherTag] = await Promise.all([
    prisma.user.create({ data: { firstName: "Owner", email: `lf-verify-bulk-owner-${runId}@example.test`, passwordHash: "verification-only", role: "OWNER", businessId: business.id } }),
    prisma.customer.create({ data: { firstName: "Active", phone: `+201${runId.slice(0, 9)}`, customerCode: `BULK-A-${runId}`, businessId: business.id } }),
    prisma.customer.create({ data: { firstName: "Inactive", phone: `+202${runId.slice(0, 9)}`, customerCode: `BULK-I-${runId}`, businessId: business.id, isActive: false } }),
    prisma.customer.create({ data: { firstName: "Other", phone: `+203${runId.slice(0, 9)}`, customerCode: `BULK-O-${runId}`, businessId: otherBusiness.id } }),
    prisma.customerTag.create({ data: { businessId: business.id, name: "Bulk tag" } }),
    prisma.customerTag.create({ data: { businessId: otherBusiness.id, name: "Other tag" } }),
  ]);
  const selectedIds = [activeCustomer.id, inactiveCustomer.id];

  const activationIds = getBulkStateChangeIds(
    [
      { id: activeCustomer.id, businessId: business.id, isActive: true },
      { id: inactiveCustomer.id, businessId: business.id, isActive: false },
    ],
    business.id,
    selectedIds,
    true
  );
  assert.deepEqual(activationIds, [inactiveCustomer.id]);

  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.customer.updateMany({
      where: { businessId: business.id, id: { in: activationIds! } },
      data: { isActive: true },
    });
    assert.equal(updated.count, 1);
    await transaction.businessActivity.createMany({
      data: activationIds!.map((customerId) => ({
        type: "CUSTOMER_REACTIVATED",
        description: "Bulk verification activation",
        businessId: business.id,
        customerId,
        createdById: owner.id,
      })),
    });
    const assignments = await transaction.customerTagAssignment.createMany({
      data: selectedIds.map((customerId) => ({ businessId: business.id, customerId, tagId: tag.id })),
    });
    assert.equal(assignments.count, 2);
    await transaction.businessActivity.createMany({
      data: selectedIds.map((customerId) => ({
        type: "CUSTOMER_TAG_ASSIGNED",
        description: "Bulk verification tag assignment",
        businessId: business.id,
        customerId,
        createdById: owner.id,
      })),
    });
  });

  assert.equal(await prisma.customer.count({ where: { businessId: business.id, isActive: true } }), 2);
  assert.equal(await prisma.customerTagAssignment.count({ where: { businessId: business.id, tagId: tag.id } }), 2);
  assert.equal(await prisma.businessActivity.count({ where: { businessId: business.id, type: "CUSTOMER_REACTIVATED" } }), 1);
  assert.equal(await prisma.businessActivity.count({ where: { businessId: business.id, type: "CUSTOMER_TAG_ASSIGNED" } }), 2);

  await assert.rejects(
    prisma.customerTagAssignment.create({
      data: { businessId: business.id, customerId: activeCustomer.id, tagId: otherTag.id },
    }),
    /foreign key|constraint/i,
    "A bulk tag assignment cannot use another tenant's tag."
  );
  assert.equal(
    getBulkStateChangeIds(
      [{ id: otherCustomer.id, businessId: otherBusiness.id, isActive: true }],
      business.id,
      [otherCustomer.id],
      false
    ),
    null
  );

  const removed = await prisma.customerTagAssignment.deleteMany({
    where: { businessId: business.id, tagId: tag.id, customerId: { in: selectedIds } },
  });
  assert.equal(removed.count, 2);
  console.log("PASS: loyalflow_test isolated bulk customer operations verification completed.");
}

main()
  .catch((error) => {
    logServerError("bulk_customer_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
