import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { deleteBusinessData } from "../lib/business/deletion";
import { logServerError } from "../lib/server/logging";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing business-deletion verification in production.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const runId = randomUUID().replaceAll("-", "");
const fixturePrefix = `danger1-${runId}`;
const fixtureBusinessIds: string[] = [];
const fixtureUserIds: string[] = [];

async function cleanup() {
  for (const businessId of fixtureBusinessIds) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    });
    if (business) {
      await prisma.$transaction((transaction) =>
        deleteBusinessData(transaction, business.id, business.name),
      );
    }
  }
  if (fixtureUserIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
  }
}

async function main() {
  const identity = await prisma.$queryRaw<Array<{ database: string }>>
    `SELECT current_database() AS database`;
  assert.equal(
    identity[0]?.database,
    "loyalflow_test",
    "Refusing to run outside the explicit loyalflow_test database.",
  );

  const [targetBusiness, controlBusiness] = await Promise.all([
    prisma.business.create({
      data: {
        name: `DANGER-1 target ${runId}`,
        slug: `${fixturePrefix}-target`,
      },
    }),
    prisma.business.create({
      data: {
        name: `DANGER-1 control ${runId}`,
        slug: `${fixturePrefix}-control`,
      },
    }),
  ]);
  fixtureBusinessIds.push(targetBusiness.id, controlBusiness.id);

  const [owner, staff, controlOwner] = await Promise.all([
    prisma.user.create({
      data: {
        firstName: "Target owner",
        email: `${fixturePrefix}-owner@example.test`,
        passwordHash: "verification-only",
        role: "OWNER",
        businessId: targetBusiness.id,
      },
    }),
    prisma.user.create({
      data: {
        firstName: "Target staff",
        email: `${fixturePrefix}-staff@example.test`,
        passwordHash: "verification-only",
        role: "STAFF",
        businessId: targetBusiness.id,
      },
    }),
    prisma.user.create({
      data: {
        firstName: "Control owner",
        email: `${fixturePrefix}-control@example.test`,
        passwordHash: "verification-only",
        role: "OWNER",
        businessId: controlBusiness.id,
      },
    }),
  ]);
  fixtureUserIds.push(owner.id, staff.id, controlOwner.id);

  const [branch, customer, reward] = await Promise.all([
    prisma.branch.create({
      data: { businessId: targetBusiness.id, name: `Branch ${runId}` },
    }),
    prisma.customer.create({
      data: {
        firstName: "Target customer",
        phone: `+${runId.slice(0, 14)}`,
        customerCode: `DANGER-${runId}`,
        businessId: targetBusiness.id,
      },
    }),
    prisma.reward.create({
      data: {
        name: "Target reward",
        cost: 1,
        businessId: targetBusiness.id,
      },
    }),
  ]);

  await prisma.branchStaffAssignment.create({
    data: {
      businessId: targetBusiness.id,
      branchId: branch.id,
      userId: staff.id,
    },
  });
  await prisma.customerNote.create({
    data: {
      businessId: targetBusiness.id,
      customerId: customer.id,
      content: "DANGER-1 restrictive user relation",
      createdById: owner.id,
      updatedById: staff.id,
    },
  });
  const transaction = await prisma.loyaltyTransaction.create({
    data: {
      type: "EARN",
      amount: 1,
      balanceAfter: 1,
      businessId: targetBusiness.id,
      customerId: customer.id,
      branchId: branch.id,
      createdById: owner.id,
      attributedStaffId: staff.id,
    },
  });
  await prisma.rewardRedemption.create({
    data: {
      rewardName: reward.name,
      cost: reward.cost,
      rewardId: reward.id,
      transactionId: transaction.id,
      customerId: customer.id,
      businessId: targetBusiness.id,
      branchId: branch.id,
      createdById: owner.id,
      attributedStaffId: staff.id,
    },
  });
  await prisma.businessActivity.create({
    data: {
      type: "LOYALTY_EARNED",
      description: "DANGER-1 restrictive activity relation",
      businessId: targetBusiness.id,
      branchId: branch.id,
      customerId: customer.id,
      createdById: owner.id,
    },
  });

  await prisma.$transaction((databaseTransaction) =>
    deleteBusinessData(
      databaseTransaction,
      targetBusiness.id,
      targetBusiness.name,
    ),
  );

  const targetCounts = await Promise.all([
    prisma.business.count({ where: { id: targetBusiness.id } }),
    prisma.customer.count({ where: { businessId: targetBusiness.id } }),
    prisma.loyaltyTransaction.count({
      where: { businessId: targetBusiness.id },
    }),
    prisma.reward.count({ where: { businessId: targetBusiness.id } }),
    prisma.rewardRedemption.count({
      where: { businessId: targetBusiness.id },
    }),
    prisma.branch.count({ where: { businessId: targetBusiness.id } }),
    prisma.branchStaffAssignment.count({
      where: { businessId: targetBusiness.id },
    }),
    prisma.customerNote.count({ where: { businessId: targetBusiness.id } }),
    prisma.businessActivity.count({
      where: { businessId: targetBusiness.id },
    }),
  ]);
  assert.deepEqual(targetCounts, Array(targetCounts.length).fill(0));

  const preservedUsers = await prisma.user.findMany({
    where: { id: { in: [owner.id, staff.id] } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      businessId: true,
      isActive: true,
      authVersion: true,
      role: true,
    },
  });
  assert.equal(preservedUsers.length, 2);
  for (const user of preservedUsers) {
    assert.equal(user.businessId, null);
    assert.equal(user.isActive, false);
    assert.equal(user.authVersion, 1);
    assert.ok(user.role === "OWNER" || user.role === "STAFF");
  }

  const survivingControl = await prisma.business.findUnique({
    where: { id: controlBusiness.id },
    select: {
      id: true,
      users: {
        where: { id: controlOwner.id },
        select: { id: true, businessId: true, isActive: true },
      },
    },
  });
  assert.equal(survivingControl?.id, controlBusiness.id);
  assert.deepEqual(survivingControl?.users, [
    {
      id: controlOwner.id,
      businessId: controlBusiness.id,
      isActive: true,
    },
  ]);

  console.log(
    "PASS: loyalflow_test real business deletion removed scoped rows, preserved neutralized users, and left the control tenant untouched.",
  );
}

main()
  .catch((error) => {
    logServerError("local_business_deletion_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((error) => {
      logServerError("local_business_deletion_cleanup_failed", error);
      process.exitCode = 1;
    });
    await prisma.$disconnect();
  });
