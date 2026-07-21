import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { canAccessBranch, canWriteAtBranch } from "../lib/branches/access";
import {
  recordLoyaltyEarn,
  recordRewardRedemption,
} from "../lib/loyalty/transactions";

const EXPECTED_MIGRATION = "20260720240000_add_multi_branch_foundation";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const runId = randomUUID().replaceAll("-", "").slice(0, 10);
const businessIds: string[] = [];

const verificationTransactionOptions = {
  maxWait: 30_000,
  timeout: 15_000,
} as const;

async function cleanup() {
  for (const businessId of businessIds) {
    await prisma.business.delete({ where: { id: businessId } }).catch(() => null);
  }
}

async function withVerificationTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(operation, verificationTransactionOptions);
}

async function main() {
  const identity = await prisma.$queryRaw<Array<{ database: string }>>
    `SELECT current_database() AS database`;
  assert.equal(identity[0]?.database, "loyalflow_test", "Refusing to run outside loyalflow_test.");

  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${EXPECTED_MIGRATION} AND finished_at IS NOT NULL`;
  assert.equal(applied.length, 1, "Apply the reviewed multi-branch migration before running this verifier.");

  const [business, otherBusiness] = await Promise.all([
    prisma.business.create({ data: { name: "Branch verification", slug: `lf-verify-branch-${runId}` } }),
    prisma.business.create({ data: { name: "Branch other tenant", slug: `lf-verify-branch-other-${runId}` } }),
  ]);
  businessIds.push(business.id, otherBusiness.id);

  const [branch, inactiveBranch, otherBranch] = await Promise.all([
    prisma.branch.create({ data: { businessId: business.id, name: "Downtown", address: "Verification address", contactPhone: "+201000000001" } }),
    prisma.branch.create({ data: { businessId: business.id, name: "Paused", isActive: false } }),
    prisma.branch.create({ data: { businessId: otherBusiness.id, name: "Other tenant" } }),
  ]);
  const [owner, cashier] = await Promise.all([
    prisma.user.create({ data: { firstName: "Owner", email: `lf-verify-branch-owner-${runId}@example.test`, passwordHash: "verification-only", role: "OWNER", businessId: business.id } }),
    prisma.user.create({ data: { firstName: "Cashier", email: `lf-verify-branch-cashier-${runId}@example.test`, passwordHash: "verification-only", role: "STAFF", businessId: business.id } }),
  ]);
  await prisma.branchStaffAssignment.create({
    data: { userId: cashier.id, branchId: branch.id, businessId: business.id },
  });
  await assert.rejects(
    prisma.branchStaffAssignment.create({
      data: { userId: cashier.id, branchId: otherBranch.id, businessId: business.id },
    }),
    /foreign key|constraint/i,
    "A staff assignment cannot cross tenant boundaries."
  );

  assert.equal(canAccessBranch({ user: cashier, businessId: business.id, branch, assignedBranchIds: [branch.id] }), true);
  assert.equal(canWriteAtBranch({ user: cashier, businessId: business.id, branch, assignedBranchIds: [branch.id], capability: "LOYALTY_EARN" }), true);
  assert.equal(canWriteAtBranch({ user: cashier, businessId: business.id, branch: inactiveBranch, assignedBranchIds: [inactiveBranch.id], capability: "LOYALTY_EARN" }), false);
  assert.equal(canWriteAtBranch({ user: owner, businessId: business.id, branch: otherBranch, capability: "LOYALTY_EARN" }), false);

  const customer = await prisma.customer.create({
    data: {
      firstName: "Branch",
      lastName: "Verification",
      phone: `+201${runId.slice(0, 9)}`,
      customerCode: `BRANCH-${runId}`,
      businessId: business.id,
    },
  });

  const earnedBalance = await withVerificationTransaction((transaction) =>
    recordLoyaltyEarn(transaction, {
      customerId: customer.id,
      businessId: business.id,
      branchId: branch.id,
      createdById: cashier.id,
      amount: 7,
      sourceLoyaltyMode: "VISITS",
      transactionNote: "Branch verification earn",
      activityDescription: "Branch verification earn",
    })
  );
  assert.equal(earnedBalance, 7);

  const redeemedBalance = await withVerificationTransaction((transaction) =>
    recordRewardRedemption(transaction, {
      customerId: customer.id,
      businessId: business.id,
      branchId: branch.id,
      createdById: cashier.id,
      cost: 2,
      rewardLabel: "Branch verification reward",
      rewardName: "Branch verification reward",
    })
  );
  assert.equal(redeemedBalance, 5);

  const crossTenantAttempt = await withVerificationTransaction((transaction) =>
    recordLoyaltyEarn(transaction, {
      customerId: customer.id,
      businessId: business.id,
      branchId: otherBranch.id,
      createdById: cashier.id,
      amount: 1,
      sourceLoyaltyMode: "VISITS",
      transactionNote: "Cross-tenant branch attempt",
      activityDescription: "Cross-tenant branch attempt",
    })
  );
  assert.equal(crossTenantAttempt, null);

  const inactiveAttempt = await withVerificationTransaction((transaction) =>
    recordLoyaltyEarn(transaction, {
      customerId: customer.id,
      businessId: business.id,
      branchId: inactiveBranch.id,
      createdById: cashier.id,
      amount: 1,
      sourceLoyaltyMode: "VISITS",
      transactionNote: "Inactive branch attempt",
      activityDescription: "Inactive branch attempt",
    })
  );
  assert.equal(inactiveAttempt, null);

  // Pre-branch records must remain explicitly unassigned; no default branch is
  // invented for a business that previously operated as one location.
  await prisma.loyaltyTransaction.create({
    data: {
      type: "ADJUSTMENT",
      amount: 0,
      balanceAfter: 5,
      note: "Pre-branch verification history",
      customerId: customer.id,
      businessId: business.id,
    },
  });

  const [transactions, redemptions, activities, currentCustomer] = await Promise.all([
    prisma.loyaltyTransaction.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "asc" } }),
    prisma.rewardRedemption.findMany({ where: { businessId: business.id } }),
    prisma.businessActivity.findMany({ where: { businessId: business.id } }),
    prisma.customer.findUniqueOrThrow({ where: { id: customer.id } }),
  ]);
  assert.equal(currentCustomer.balance, 5);
  assert.equal(transactions.length, 3);
  assert.equal(transactions.filter((transaction) => transaction.branchId === branch.id).length, 2);
  assert.equal(transactions.filter((transaction) => transaction.branchId === null).length, 1);
  assert.equal(redemptions.length, 1);
  assert.equal(redemptions[0]?.branchId, branch.id);
  assert.equal(activities.length, 2);
  assert.ok(activities.every((activity) => activity.branchId === branch.id));

  const branchTotals = await prisma.loyaltyTransaction.groupBy({
    by: ["branchId"],
    where: { businessId: business.id },
    _sum: { amount: true },
  });
  assert.deepEqual(
    branchTotals.find((total) => total.branchId === branch.id)?._sum.amount,
    5
  );
  assert.deepEqual(
    branchTotals.find((total) => total.branchId === null)?._sum.amount,
    0
  );
  assert.equal(
    await prisma.loyaltyTransaction.count({ where: { businessId: business.id, branchId: branch.id } }),
    2
  );
  console.log("PASS: loyalflow_test multi-branch migration and isolated verification completed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
