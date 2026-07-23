import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { logServerError } from "../lib/server/logging";
import { canAccessBranch, canWriteAtBranch } from "../lib/branches/access";
import {
  recordLoyaltyEarn,
  recordRewardRedemption,
} from "../lib/loyalty/transactions";

const EXPECTED_MIGRATIONS = [
  "20260720240000_add_multi_branch_foundation",
  "20260721170000_add_staff_attribution_foundation",
] as const;
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
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name IN (${Prisma.join(EXPECTED_MIGRATIONS)}) AND finished_at IS NOT NULL`;
  assert.equal(
    applied.length,
    EXPECTED_MIGRATIONS.length,
    "Apply the reviewed branch and staff attribution migrations before running this verifier.",
  );

  const [business, otherBusiness] = await Promise.all([
    prisma.business.create({
      data: {
        name: "Branch verification",
        slug: `lf-verify-branch-${runId}`,
        staffAttributionEnabled: true,
        staffAttributionRequired: true,
      },
    }),
    prisma.business.create({ data: { name: "Branch other tenant", slug: `lf-verify-branch-other-${runId}` } }),
  ]);
  businessIds.push(business.id, otherBusiness.id);

  const [branch, unassignedBranch, inactiveBranch, otherBranch] = await Promise.all([
    prisma.branch.create({ data: { businessId: business.id, name: "Downtown", address: "Verification address", contactPhone: "+201000000001" } }),
    prisma.branch.create({ data: { businessId: business.id, name: "Unassigned" } }),
    prisma.branch.create({ data: { businessId: business.id, name: "Paused", isActive: false } }),
    prisma.branch.create({ data: { businessId: otherBusiness.id, name: "Other tenant" } }),
  ]);
  const [owner, cashier, inactiveStaff, otherTenantStaff] = await Promise.all([
    prisma.user.create({ data: { firstName: "Owner", email: `lf-verify-branch-owner-${runId}@example.test`, passwordHash: "verification-only", role: "OWNER", businessId: business.id } }),
    prisma.user.create({ data: { firstName: "Cashier", email: `lf-verify-branch-cashier-${runId}@example.test`, passwordHash: "verification-only", role: "STAFF", businessId: business.id } }),
    prisma.user.create({ data: { firstName: "Inactive", email: `lf-verify-branch-inactive-${runId}@example.test`, passwordHash: "verification-only", role: "STAFF", isActive: false, businessId: business.id } }),
    prisma.user.create({ data: { firstName: "Other", email: `lf-verify-branch-other-staff-${runId}@example.test`, passwordHash: "verification-only", role: "STAFF", businessId: otherBusiness.id } }),
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

  const cashierActor = {
    id: cashier.id,
    role: cashier.role,
    businessId: business.id,
  } as const;

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
      actor: cashierActor,
      attributedStaffId: cashier.id,
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
      actor: cashierActor,
      attributedStaffId: cashier.id,
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
      actor: cashierActor,
      attributedStaffId: cashier.id,
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
      actor: cashierActor,
      attributedStaffId: cashier.id,
      amount: 1,
      sourceLoyaltyMode: "VISITS",
      transactionNote: "Inactive branch attempt",
      activityDescription: "Inactive branch attempt",
    })
  );
  assert.equal(inactiveAttempt, null);

  const [unassignedAttempt, missingAttributionAttempt, inactiveAttributionAttempt, crossTenantAttributionAttempt] = await Promise.all([
    withVerificationTransaction((transaction) =>
      recordLoyaltyEarn(transaction, {
        customerId: customer.id,
        businessId: business.id,
        branchId: unassignedBranch.id,
        actor: cashierActor,
        attributedStaffId: cashier.id,
        amount: 1,
        sourceLoyaltyMode: "VISITS",
        transactionNote: "Unassigned branch attempt",
        activityDescription: "Unassigned branch attempt",
      }),
    ),
    withVerificationTransaction((transaction) =>
      recordLoyaltyEarn(transaction, {
        customerId: customer.id,
        businessId: business.id,
        branchId: branch.id,
        actor: cashierActor,
        amount: 1,
        sourceLoyaltyMode: "VISITS",
        transactionNote: "Missing attribution attempt",
        activityDescription: "Missing attribution attempt",
      }),
    ),
    withVerificationTransaction((transaction) =>
      recordLoyaltyEarn(transaction, {
        customerId: customer.id,
        businessId: business.id,
        branchId: branch.id,
        actor: cashierActor,
        attributedStaffId: inactiveStaff.id,
        amount: 1,
        sourceLoyaltyMode: "VISITS",
        transactionNote: "Inactive attribution attempt",
        activityDescription: "Inactive attribution attempt",
      }),
    ),
    withVerificationTransaction((transaction) =>
      recordLoyaltyEarn(transaction, {
        customerId: customer.id,
        businessId: business.id,
        branchId: branch.id,
        actor: cashierActor,
        attributedStaffId: otherTenantStaff.id,
        amount: 1,
        sourceLoyaltyMode: "VISITS",
        transactionNote: "Cross-tenant attribution attempt",
        activityDescription: "Cross-tenant attribution attempt",
      }),
    ),
  ]);
  assert.deepEqual(
    [
      unassignedAttempt,
      missingAttributionAttempt,
      inactiveAttributionAttempt,
      crossTenantAttributionAttempt,
    ],
    [null, null, null, null],
  );

  await prisma.business.update({
    where: { id: business.id },
    data: { staffAttributionRequired: false },
  });
  const optionalAttributionAttempt = await withVerificationTransaction((transaction) =>
    recordLoyaltyEarn(transaction, {
      customerId: customer.id,
      businessId: business.id,
      branchId: branch.id,
      actor: cashierActor,
      amount: 1,
      sourceLoyaltyMode: "VISITS",
      transactionNote: "Optional attribution verification",
      activityDescription: "Optional attribution verification",
    }),
  );
  assert.equal(optionalAttributionAttempt, 6);

  // Pre-branch records must remain explicitly unassigned; no default branch is
  // invented for a business that previously operated as one location.
  await prisma.loyaltyTransaction.create({
    data: {
      type: "ADJUSTMENT",
      amount: 0,
      balanceAfter: 6,
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
  assert.equal(currentCustomer.balance, 6);
  assert.equal(transactions.length, 4);
  assert.equal(transactions.filter((transaction) => transaction.branchId === branch.id).length, 3);
  assert.equal(transactions.filter((transaction) => transaction.branchId === null).length, 1);
  assert.equal(redemptions.length, 1);
  assert.equal(redemptions[0]?.branchId, branch.id);
  assert.equal(redemptions[0]?.createdById, cashier.id);
  assert.equal(redemptions[0]?.attributedStaffId, cashier.id);
  assert.equal(activities.length, 3);
  assert.ok(activities.every((activity) => activity.branchId === branch.id));
  assert.ok(activities.every((activity) => activity.createdById === cashier.id));
  assert.equal(
    transactions.filter((transaction) => transaction.attributedStaffId === cashier.id).length,
    2,
  );
  assert.equal(
    transactions.filter((transaction) => transaction.attributedStaffId === null).length,
    2,
  );

  const branchTotals = await prisma.loyaltyTransaction.groupBy({
    by: ["branchId"],
    where: { businessId: business.id },
    _sum: { amount: true },
  });
  assert.deepEqual(
    branchTotals.find((total) => total.branchId === branch.id)?._sum.amount,
    6
  );
  assert.deepEqual(
    branchTotals.find((total) => total.branchId === null)?._sum.amount,
    0
  );
  assert.equal(
    await prisma.loyaltyTransaction.count({ where: { businessId: business.id, branchId: branch.id } }),
    3
  );
  console.log("PASS: loyalflow_test multi-branch migration and isolated verification completed.");
}

main()
  .catch((error) => {
    logServerError("multi_branch_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
