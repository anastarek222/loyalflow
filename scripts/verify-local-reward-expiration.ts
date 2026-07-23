import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient, RewardType } from "../generated/prisma/client";
import { recordRewardRedemption } from "../lib/loyalty/transactions";
import {
  getPersistedRewardUnlockState,
  getRewardUnlockRedemptionState,
} from "../lib/rewards/expiration";
import { logServerError } from "../lib/server/logging";

const EXPECTED_MIGRATION = "20260720210000_add_reward_expiration";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const fixtureBusinessIds: string[] = [];
const transactionOptions = { maxWait: 30_000, timeout: 15_000 } as const;

async function withVerificationTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(operation, transactionOptions);
}

async function cleanup() {
  for (const businessId of fixtureBusinessIds) {
    await prisma.business.delete({ where: { id: businessId } }).catch(() => null);
  }
}

async function main() {
  const identity = await prisma.$queryRaw<Array<{ database: string }>>
    `SELECT current_database() AS database`;
  assert.equal(identity[0]?.database, "loyalflow_test", "Refusing to run outside loyalflow_test.");
  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${EXPECTED_MIGRATION} AND finished_at IS NOT NULL`;
  assert.equal(applied.length, 1, "Apply the reviewed reward-expiration migration before running this verifier.");

  const business = await prisma.business.create({
    data: {
      name: "LoyalFlow reward expiry verification",
      slug: `lf-verify-expiry-${runId}`,
      loyaltyMode: "VISITS",
      unitName: "visit",
      rewardThreshold: 5,
      earnAmount: 1,
    },
  });
  fixtureBusinessIds.push(business.id);
  const otherBusiness = await prisma.business.create({
    data: {
      name: "LoyalFlow reward expiry other tenant",
      slug: `lf-verify-expiry-other-${runId}`,
      loyaltyMode: "VISITS",
      unitName: "visit",
      rewardThreshold: 5,
      earnAmount: 1,
    },
  });
  fixtureBusinessIds.push(otherBusiness.id);

  const [activeCustomer, expiredCustomer] = await Promise.all([
    prisma.customer.create({ data: { firstName: "Active", phone: `+201${runId.slice(0, 9)}`, customerCode: `EXP-A-${runId}`, balance: 5, businessId: business.id } }),
    prisma.customer.create({ data: { firstName: "Expired", phone: `+202${runId.slice(0, 9)}`, customerCode: `EXP-E-${runId}`, balance: 5, businessId: business.id } }),
  ]);
  const [expiringReward, legacyReward, otherReward] = await Promise.all([
    prisma.reward.create({ data: { name: "Expires", type: RewardType.GIFT, cost: 5, expiresAfterDays: 1, businessId: business.id } }),
    prisma.reward.create({ data: { name: "Legacy", type: RewardType.GIFT, cost: 5, businessId: business.id } }),
    prisma.reward.create({ data: { name: "Other tenant", type: RewardType.GIFT, cost: 5, expiresAfterDays: 1, businessId: otherBusiness.id } }),
  ]);
  assert.equal(legacyReward.expiresAfterDays, null, "Legacy rewards must remain non-expiring.");

  const now = new Date("2026-07-20T12:00:00.000Z");
  const activeUnlock = await prisma.rewardUnlock.create({
    data: { businessId: business.id, customerId: activeCustomer.id, rewardId: expiringReward.id, unlockedAt: now, expiresAt: new Date("2026-07-21T12:00:00.000Z") },
  });
  const expiredUnlock = await prisma.rewardUnlock.create({
    data: { businessId: business.id, customerId: expiredCustomer.id, rewardId: expiringReward.id, unlockedAt: new Date("2026-07-18T12:00:00.000Z"), expiresAt: now },
  });
  await assert.rejects(
    prisma.rewardUnlock.create({
      data: {
        businessId: business.id,
        customerId: activeCustomer.id,
        rewardId: expiringReward.id,
        unlockedAt: now,
        expiresAt: new Date("2026-07-21T12:00:00.000Z"),
      },
    }),
    "A customer can have only one live unlock for the same reward."
  );
  assert.equal(getPersistedRewardUnlockState({ expiresAt: activeUnlock.expiresAt, redeemedAt: null, expiredAt: null, now }), "ACTIVE");
  assert.equal(getRewardUnlockRedemptionState({ expectedBusinessId: business.id, unlockBusinessId: activeUnlock.businessId, rewardBusinessId: expiringReward.businessId, expiresAt: activeUnlock.expiresAt, redeemedAt: null, expiredAt: null, now }), "ACTIVE");
  assert.equal(getRewardUnlockRedemptionState({ expectedBusinessId: business.id, unlockBusinessId: business.id, rewardBusinessId: otherReward.businessId, expiresAt: activeUnlock.expiresAt, redeemedAt: null, expiredAt: null, now }), "WRONG_TENANT");

  const redeemedBalance = await withVerificationTransaction(async (transaction) => {
    const balance = await recordRewardRedemption(transaction, {
      customerId: activeCustomer.id,
      businessId: business.id,
      createdById: undefined,
      cost: expiringReward.cost,
      rewardName: expiringReward.name,
      rewardLabel: expiringReward.name,
      rewardId: expiringReward.id,
    });
    assert.equal(balance, 0);
    await transaction.rewardUnlock.update({ where: { id: activeUnlock.id }, data: { redeemedAt: now } });
    return balance;
  });
  assert.equal(redeemedBalance, 0, "An active expiring reward should redeem normally.");

  const blocked = await withVerificationTransaction(async (transaction) => {
    const state = getPersistedRewardUnlockState({ expiresAt: expiredUnlock.expiresAt, redeemedAt: null, expiredAt: null, now });
    assert.equal(state, "EXPIRED", "The expiry boundary is exclusive of the exact expiry instant.");
    await transaction.rewardUnlock.update({ where: { id: expiredUnlock.id }, data: { expiredAt: now } });
    await transaction.businessActivity.createMany({
      data: [
        { type: "REWARD_EXPIRED", description: "Verification expiry", businessId: business.id, customerId: expiredCustomer.id },
        { type: "REWARD_REDEMPTION_BLOCKED", description: "Verification blocked redemption", businessId: business.id, customerId: expiredCustomer.id },
      ],
    });
    return true;
  });
  assert.equal(blocked, true);
  const unchangedExpiredCustomer = await prisma.customer.findUniqueOrThrow({ where: { id: expiredCustomer.id } });
  assert.equal(unchangedExpiredCustomer.balance, 5, "An expired reward must never silently remove base balance.");
  assert.equal(await prisma.rewardRedemption.count({ where: { customerId: expiredCustomer.id, businessId: business.id } }), 0);
  assert.equal(await prisma.businessActivity.count({ where: { businessId: business.id, customerId: expiredCustomer.id, type: { in: ["REWARD_EXPIRED", "REWARD_REDEMPTION_BLOCKED"] } } }), 2);

  console.log("PASS: loyalflow_test reward-expiration migration and isolated verification completed.");
}

main()
  .catch((error) => {
    logServerError("reward_expiration_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
