import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  RewardType,
  type Prisma,
} from "../generated/prisma/client";
import { recordRedemptionReversal } from "../lib/loyalty/redemption-reversal";
import {
  FinancialOperationAbortedError,
  FinancialOperationConflictError,
  recordRewardRedemption,
} from "../lib/loyalty/transactions";
import { logServerError } from "../lib/server/logging";

const REQUIRED_MIGRATION = "20260807182500_add_reward_unlock_redemption_link";
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

async function createCustomer(businessId: string, suffix: string, balance = 5) {
  return prisma.customer.create({
    data: {
      firstName: "Unlock",
      lastName: suffix,
      phone: `+208${randomUUID().replaceAll("-", "").slice(0, 11)}`,
      customerCode: `UNLOCK-${runId}-${suffix}`,
      businessId,
      balance,
      lifetimeEarned: balance,
    },
  });
}

function redeem(
  customerId: string,
  businessId: string,
  rewardId: string,
  unlockId?: string,
) {
  return inTransaction((transaction) =>
    recordRewardRedemption(transaction, {
      customerId,
      businessId,
      rewardId,
      cost: 5,
      rewardName: "Unlock restoration reward",
      rewardLabel: "Unlock restoration reward",
      idempotencyKey: randomUUID(),
      ...(unlockId ? { unlockId } : {}),
    }),
  );
}

function reverse(input: {
  customerId: string;
  businessId: string;
  redemptionId: string;
  transactionId: string;
  operationId: string;
  restoreUnlock: boolean;
}) {
  return inTransaction((transaction) =>
    recordRedemptionReversal(transaction, {
      customerId: input.customerId,
      businessId: input.businessId,
      originalRedemptionId: input.redemptionId,
      originalTransactionId: input.transactionId,
      actor: {
        id: `verification-super-admin-${runId}`,
        role: "SUPER_ADMIN",
        businessId: null,
      },
      reason: "Real PostgreSQL unlock restoration verification",
      idempotencyKey: input.operationId,
      restoreUnlock: input.restoreUnlock,
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
    "Refusing to run destructive unlock restoration verification outside loyalflow_test.",
  );

  const migration = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${REQUIRED_MIGRATION} AND finished_at IS NOT NULL
  `;
  assert.equal(
    migration.length,
    1,
    "The reward-unlock redemption provenance migration is required.",
  );

  const business = await prisma.business.create({
    data: {
      name: "LoyalFlow unlock restoration verification",
      slug: `lf-unlock-restoration-${runId}`,
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
      name: "Unlock restoration reward",
      type: RewardType.GIFT,
      cost: 5,
      expiresAfterDays: 1,
    },
  });

  const restoreCustomer = await createCustomer(business.id, "restore");
  const restoreUnlock = await prisma.rewardUnlock.create({
    data: {
      businessId: business.id,
      customerId: restoreCustomer.id,
      rewardId: reward.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  await redeem(restoreCustomer.id, business.id, reward.id, restoreUnlock.id);

  const linkedRedemption = await prisma.rewardRedemption.findFirstOrThrow({
    where: {
      businessId: business.id,
      customerId: restoreCustomer.id,
      rewardUnlockId: restoreUnlock.id,
    },
    select: { id: true, transactionId: true, rewardUnlockId: true },
  });
  assert.ok(linkedRedemption.transactionId);
  assert.equal(linkedRedemption.rewardUnlockId, restoreUnlock.id);
  assert.ok(
    (await prisma.rewardUnlock.findUniqueOrThrow({ where: { id: restoreUnlock.id } }))
      .redeemedAt,
  );

  const restoreOperationId = randomUUID();
  const applied = await reverse({
    customerId: restoreCustomer.id,
    businessId: business.id,
    redemptionId: linkedRedemption.id,
    transactionId: linkedRedemption.transactionId,
    operationId: restoreOperationId,
    restoreUnlock: true,
  });
  assert.equal(applied.status, "APPLIED");
  assert.deepEqual(
    await prisma.customer.findUniqueOrThrow({
      where: {
        id_businessId: {
          id: restoreCustomer.id,
          businessId: business.id,
        },
      },
      select: { balance: true, lifetimeRedeemed: true },
    }),
    { balance: 5, lifetimeRedeemed: 5 },
  );
  assert.equal(
    (await prisma.rewardUnlock.findUniqueOrThrow({ where: { id: restoreUnlock.id } }))
      .redeemedAt,
    null,
  );
  assert.equal(
    await prisma.loyaltyTransaction.count({
      where: { businessId: business.id, idempotencyKey: restoreOperationId },
    }),
    1,
  );
  console.log("PASS A: linked redemption reversal restored the exact RewardUnlock atomically.");

  const replayed = await reverse({
    customerId: restoreCustomer.id,
    businessId: business.id,
    redemptionId: linkedRedemption.id,
    transactionId: linkedRedemption.transactionId,
    operationId: restoreOperationId,
    restoreUnlock: true,
  });
  assert.equal(replayed.status, "REPLAYED");
  assert.equal(
    await prisma.loyaltyTransaction.count({
      where: { businessId: business.id, idempotencyKey: restoreOperationId },
    }),
    1,
  );
  console.log("PASS B: identical unlock-restoration retry replayed without a second ledger write.");

  await assert.rejects(
    reverse({
      customerId: restoreCustomer.id,
      businessId: business.id,
      redemptionId: linkedRedemption.id,
      transactionId: linkedRedemption.transactionId,
      operationId: restoreOperationId,
      restoreUnlock: false,
    }),
    FinancialOperationConflictError,
  );
  console.log("PASS C: changing restoreUnlock intent for the same operation ID conflicts.");

  const legacyCustomer = await createCustomer(business.id, "legacy");
  await redeem(legacyCustomer.id, business.id, reward.id);
  const legacyRedemption = await prisma.rewardRedemption.findFirstOrThrow({
    where: { businessId: business.id, customerId: legacyCustomer.id },
    select: { id: true, transactionId: true, rewardUnlockId: true },
  });
  assert.ok(legacyRedemption.transactionId);
  assert.equal(legacyRedemption.rewardUnlockId, null);
  const legacyResult = await reverse({
    customerId: legacyCustomer.id,
    businessId: business.id,
    redemptionId: legacyRedemption.id,
    transactionId: legacyRedemption.transactionId,
    operationId: randomUUID(),
    restoreUnlock: true,
  });
  assert.deepEqual(legacyResult, {
    status: "BLOCKED",
    reason: "UNLOCK_RESTORE_UNSUPPORTED",
  });
  assert.equal(
    (await prisma.customer.findUniqueOrThrow({ where: { id: legacyCustomer.id } })).balance,
    0,
  );
  console.log("PASS D: legacy redemption without durable unlock provenance stayed non-restorable.");

  const rollbackCustomer = await createCustomer(business.id, "rollback");
  const rollbackUnlock = await prisma.rewardUnlock.create({
    data: {
      businessId: business.id,
      customerId: rollbackCustomer.id,
      rewardId: reward.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  await redeem(rollbackCustomer.id, business.id, reward.id, rollbackUnlock.id);
  const rollbackRedemption = await prisma.rewardRedemption.findFirstOrThrow({
    where: {
      businessId: business.id,
      customerId: rollbackCustomer.id,
      rewardUnlockId: rollbackUnlock.id,
    },
    select: { id: true, transactionId: true },
  });
  assert.ok(rollbackRedemption.transactionId);
  await prisma.customer.update({
    where: { id: rollbackCustomer.id },
    data: { isActive: false },
  });
  await assert.rejects(
    reverse({
      customerId: rollbackCustomer.id,
      businessId: business.id,
      redemptionId: rollbackRedemption.id,
      transactionId: rollbackRedemption.transactionId,
      operationId: randomUUID(),
      restoreUnlock: true,
    }),
    FinancialOperationAbortedError,
  );
  assert.ok(
    (await prisma.rewardUnlock.findUniqueOrThrow({ where: { id: rollbackUnlock.id } }))
      .redeemedAt,
  );
  assert.equal(
    await prisma.loyaltyTransaction.count({
      where: {
        businessId: business.id,
        reversalOfTransactionId: rollbackRedemption.transactionId,
        reversalKind: "REDEMPTION_REVERSAL",
      },
    }),
    0,
  );
  console.log("PASS E: failed balance reversal rolled back the unlock restoration with no reversal ledger row.");
}

main()
  .catch((error: unknown) => {
    logServerError("redemption_unlock_restoration_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
