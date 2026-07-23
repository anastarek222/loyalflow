import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  RewardType,
  type Prisma,
} from "../generated/prisma/client";
import {
  FinancialOperationConflictError,
  recordLoyaltyEarn,
  recordRewardRedemption,
} from "../lib/loyalty/transactions";
import { logServerError } from "../lib/server/logging";

const REQUIRED_MIGRATION = "20260723054319_link_reward_redemption_to_ledger";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const fixtureBusinessIds: string[] = [];
const transactionOptions = { maxWait: 30_000, timeout: 15_000 } as const;

async function inTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(operation, transactionOptions);
}

async function createCustomer(businessId: string, suffix: string, balance = 0) {
  return prisma.customer.create({
    data: {
      firstName: "Financial",
      lastName: suffix,
      phone: `+209${randomUUID().replaceAll("-", "").slice(0, 11)}`,
      customerCode: `FIN-${runId}-${suffix}`,
      businessId,
      balance,
      lifetimeEarned: balance,
    },
  });
}

function earn(
  customerId: string,
  businessId: string,
  amount: number,
  idempotencyKey: string,
) {
  return inTransaction((transaction) =>
    recordLoyaltyEarn(transaction, {
      customerId,
      businessId,
      amount,
      sourceLoyaltyMode: "VISITS",
      idempotencyKey,
      transactionNote: "Financial integrity verification earn",
      activityDescription: "Financial integrity verification earn",
    }),
  );
}

function redeem(
  customerId: string,
  businessId: string,
  rewardId: string,
  cost: number,
  idempotencyKey: string,
  unlockId?: string,
) {
  return inTransaction((transaction) =>
    recordRewardRedemption(transaction, {
      customerId,
      businessId,
      rewardId,
      cost,
      rewardName: "Financial integrity reward",
      rewardLabel: "Financial integrity reward",
      idempotencyKey,
      ...(unlockId ? { unlockId } : {}),
    }),
  );
}

async function cleanup() {
  for (const businessId of fixtureBusinessIds) {
    await prisma.business.delete({ where: { id: businessId } }).catch(() => undefined);
  }
}

async function main() {
  const database = await prisma.$queryRaw<{ database: string }[]>`
    SELECT current_database() AS database
  `;
  assert.equal(
    database[0]?.database,
    "loyalflow_test",
    "Refusing to run destructive financial verification outside loyalflow_test.",
  );

  const migration = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${REQUIRED_MIGRATION} AND finished_at IS NOT NULL
  `;
  assert.equal(migration.length, 1, "The prerequisite ledger-link migration is required.");

  const business = await prisma.business.create({
    data: {
      name: "LoyalFlow financial integrity verification",
      slug: `lf-financial-integrity-${runId}`,
      loyaltyMode: "VISITS",
      unitName: "visit",
      rewardThreshold: 5,
      earnAmount: 1,
    },
  });
  fixtureBusinessIds.push(business.id);

  const reward = await prisma.reward.create({
    data: {
      businessId: business.id,
      name: "Financial integrity reward",
      type: RewardType.GIFT,
      cost: 5,
      expiresAfterDays: 1,
    },
  });

  const duplicateEarnCustomer = await createCustomer(business.id, "duplicate-earn");
  const duplicateEarnKey = randomUUID();
  await Promise.all([
    earn(duplicateEarnCustomer.id, business.id, 2, duplicateEarnKey),
    earn(duplicateEarnCustomer.id, business.id, 2, duplicateEarnKey),
  ]);
  assert.deepEqual(
    await prisma.customer.findUniqueOrThrow({
      where: { id_businessId: { id: duplicateEarnCustomer.id, businessId: business.id } },
      select: { balance: true, lifetimeEarned: true },
    }),
    { balance: 2, lifetimeEarned: 2 },
  );
  assert.equal(
    await prisma.loyaltyTransaction.count({
      where: { businessId: business.id, idempotencyKey: duplicateEarnKey },
    }),
    1,
  );
  console.log("PASS A: simultaneous duplicate earn applied once with one ledger operation.");

  const concurrentEarnCustomer = await createCustomer(business.id, "distinct-earn");
  await Promise.all([
    earn(concurrentEarnCustomer.id, business.id, 2, randomUUID()),
    earn(concurrentEarnCustomer.id, business.id, 3, randomUUID()),
  ]);
  assert.deepEqual(
    await prisma.customer.findUniqueOrThrow({
      where: { id_businessId: { id: concurrentEarnCustomer.id, businessId: business.id } },
      select: { balance: true, lifetimeEarned: true },
    }),
    { balance: 5, lifetimeEarned: 5 },
  );
  console.log("PASS B: simultaneous distinct earns preserved both balance effects.");

  const duplicateRedeemCustomer = await createCustomer(business.id, "duplicate-redeem", 10);
  const duplicateRedeemKey = randomUUID();
  await Promise.all([
    redeem(duplicateRedeemCustomer.id, business.id, reward.id, 5, duplicateRedeemKey),
    redeem(duplicateRedeemCustomer.id, business.id, reward.id, 5, duplicateRedeemKey),
  ]);
  const duplicateRedeemLedger = await prisma.loyaltyTransaction.findMany({
    where: { businessId: business.id, idempotencyKey: duplicateRedeemKey },
    include: { rewardRedemption: true },
  });
  assert.equal(duplicateRedeemLedger.length, 1);
  assert.ok(duplicateRedeemLedger[0]?.rewardRedemption);
  assert.equal(duplicateRedeemLedger[0]?.rewardRedemption?.transactionId, duplicateRedeemLedger[0]?.id);
  assert.deepEqual(
    await prisma.customer.findUniqueOrThrow({
      where: { id_businessId: { id: duplicateRedeemCustomer.id, businessId: business.id } },
      select: { balance: true, lifetimeRedeemed: true },
    }),
    { balance: 5, lifetimeRedeemed: 5 },
  );
  console.log("PASS C: simultaneous duplicate redemption deducted and linked exactly once.");

  const competingCustomer = await createCustomer(business.id, "competing-redeem", 5);
  const unlock = await prisma.rewardUnlock.create({
    data: {
      businessId: business.id,
      customerId: competingCustomer.id,
      rewardId: reward.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  const competingResults = await Promise.all([
    redeem(competingCustomer.id, business.id, reward.id, 5, randomUUID(), unlock.id),
    redeem(competingCustomer.id, business.id, reward.id, 5, randomUUID(), unlock.id),
  ]);
  assert.equal(competingResults.filter((result) => result !== null).length, 1);
  assert.deepEqual(
    await prisma.customer.findUniqueOrThrow({
      where: { id_businessId: { id: competingCustomer.id, businessId: business.id } },
      select: { balance: true, lifetimeRedeemed: true },
    }),
    { balance: 0, lifetimeRedeemed: 5 },
  );
  assert.ok(
    (await prisma.rewardUnlock.findUniqueOrThrow({ where: { id: unlock.id } })).redeemedAt,
  );
  console.log("PASS D: competing unlock redemptions allowed exactly one financial claim.");

  const conflictCustomer = await createCustomer(business.id, "conflict");
  const conflictKey = randomUUID();
  await earn(conflictCustomer.id, business.id, 2, conflictKey);
  await assert.rejects(
    earn(conflictCustomer.id, business.id, 3, conflictKey),
    FinancialOperationConflictError,
  );
  assert.deepEqual(
    await prisma.customer.findUniqueOrThrow({
      where: { id_businessId: { id: conflictCustomer.id, businessId: business.id } },
      select: { balance: true, lifetimeEarned: true },
    }),
    { balance: 2, lifetimeEarned: 2 },
  );
  console.log("PASS E: conflicting intent for one operation ID was rejected unchanged.");

  const rollbackCustomer = await createCustomer(business.id, "rollback");
  const promotion = await prisma.promotion.create({
    data: {
      businessId: business.id,
      name: "Financial integrity rollback promotion",
      bonusAmount: 3,
      loyaltyMode: "VISITS",
    },
  });
  await assert.rejects(
    inTransaction(async (transaction) => {
      await recordLoyaltyEarn(transaction, {
        customerId: rollbackCustomer.id,
        businessId: business.id,
        amount: 2,
        sourceLoyaltyMode: "VISITS",
        idempotencyKey: randomUUID(),
        transactionNote: "Rollback verification",
        activityDescription: "Rollback verification",
        promotion: { id: promotion.id, businessId: business.id, bonusAmount: 3 },
      });
      throw new Error("Controlled financial rollback");
    }),
    /Controlled financial rollback/,
  );
  assert.deepEqual(
    await prisma.customer.findUniqueOrThrow({
      where: { id_businessId: { id: rollbackCustomer.id, businessId: business.id } },
      select: { balance: true, lifetimeEarned: true, lifetimeRedeemed: true },
    }),
    { balance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 },
  );
  assert.equal(await prisma.loyaltyTransaction.count({ where: { customerId: rollbackCustomer.id, businessId: business.id } }), 0);
  assert.equal(await prisma.rewardRedemption.count({ where: { customerId: rollbackCustomer.id, businessId: business.id } }), 0);
  assert.equal(await prisma.promotionApplication.count({ where: { customerId: rollbackCustomer.id, businessId: business.id } }), 0);
  console.log("PASS F: controlled transaction rollback left no financial or promotion orphans.");
}

main()
  .catch((error: unknown) => {
    logServerError("financial_integrity_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
