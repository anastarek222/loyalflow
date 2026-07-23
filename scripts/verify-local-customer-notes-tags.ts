import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { getCustomerTagWhere } from "../lib/customers/notes-tags";
import { logServerError } from "../lib/server/logging";

const EXPECTED_MIGRATION = "20260720250000_add_customer_notes_and_tags";
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
  assert.equal(applied.length, 1, "Apply the reviewed customer-notes/tags migration before running this verifier.");

  const [business, otherBusiness] = await Promise.all([
    prisma.business.create({ data: { name: "Notes verification", slug: `lf-verify-notes-${runId}` } }),
    prisma.business.create({ data: { name: "Notes other tenant", slug: `lf-verify-notes-other-${runId}` } }),
  ]);
  businessIds.push(business.id, otherBusiness.id);

  const [owner, manager, customer, otherCustomer] = await Promise.all([
    prisma.user.create({ data: { firstName: "Owner", email: `lf-verify-notes-owner-${runId}@example.test`, passwordHash: "verification-only", role: "OWNER", businessId: business.id } }),
    prisma.user.create({ data: { firstName: "Manager", email: `lf-verify-notes-manager-${runId}@example.test`, passwordHash: "verification-only", role: "MANAGER", businessId: business.id } }),
    prisma.customer.create({ data: { firstName: "Private", phone: `+201${runId.slice(0, 9)}`, customerCode: `NOTES-${runId}`, businessId: business.id } }),
    prisma.customer.create({ data: { firstName: "Other", phone: `+202${runId.slice(0, 9)}`, customerCode: `NOTES-OTHER-${runId}`, businessId: otherBusiness.id } }),
  ]);

  const [vipTag, otherTag] = await Promise.all([
    prisma.customerTag.create({ data: { businessId: business.id, name: "VIP" } }),
    prisma.customerTag.create({ data: { businessId: otherBusiness.id, name: "Other tenant" } }),
  ]);

  const assignment = await prisma.customerTagAssignment.create({
    data: { businessId: business.id, customerId: customer.id, tagId: vipTag.id },
  });
  assert.equal(
    await prisma.customer.count({
      where: { businessId: business.id, ...getCustomerTagWhere(vipTag.id) },
    }),
    1
  );
  assert.equal(
    await prisma.customer.count({
      where: { businessId: otherBusiness.id, ...getCustomerTagWhere(vipTag.id) },
    }),
    0
  );
  await assert.rejects(
    prisma.customerTagAssignment.create({
      data: { businessId: business.id, customerId: customer.id, tagId: otherTag.id },
    }),
    /foreign key|constraint/i,
    "A tag from another tenant cannot be assigned."
  );
  await prisma.customerTagAssignment.delete({ where: { id: assignment.id } });
  assert.equal(
    await prisma.customerTagAssignment.count({ where: { businessId: business.id, customerId: customer.id } }),
    0
  );

  await prisma.customerTagAssignment.create({
    data: { businessId: business.id, customerId: customer.id, tagId: vipTag.id },
  });
  const note = await prisma.customerNote.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      content: "Private verification note",
      createdById: owner.id,
      updatedById: owner.id,
    },
  });
  const updatedNote = await prisma.customerNote.update({
    where: { id: note.id },
    data: { content: "Updated private verification note", updatedById: manager.id },
    include: { createdBy: true, updatedBy: true },
  });
  assert.equal(updatedNote.customerId, customer.id);
  assert.equal(updatedNote.businessId, business.id);
  assert.equal(updatedNote.createdBy?.id, owner.id);
  assert.equal(updatedNote.updatedBy?.id, manager.id);
  assert.equal(updatedNote.content, "Updated private verification note");
  assert.equal(
    await prisma.customerNote.count({ where: { businessId: otherBusiness.id, customerId: otherCustomer.id } }),
    0
  );

  const publicProjection = await prisma.customer.findUniqueOrThrow({
    where: { publicToken: customer.publicToken },
    select: { id: true, firstName: true, balance: true },
  });
  assert.deepEqual(Object.keys(publicProjection).sort(), ["balance", "firstName", "id"]);
  console.log("PASS: loyalflow_test customer-notes/tags migration and isolated verification completed.");
}

main()
  .catch((error) => {
    logServerError("customer_notes_tags_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
