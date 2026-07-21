import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  Prisma,
  PrismaClient,
} from "../generated/prisma/client";
import { recordLoyaltyEarn } from "../lib/loyalty/transactions";
import {
  calculatePromotionBonus,
  selectEligiblePromotion,
} from "../lib/promotions/engine";

const EXPECTED_PROMOTION_MIGRATION =
  "20260720200000_add_earn_idempotency_and_promotion_multiplier";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const fixtureBusinessIds: string[] = [];
const transactionOptions = {
  maxWait: 30_000,
  timeout: 15_000,
} as const;

async function withVerificationTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(operation, transactionOptions);
}

async function cleanup() {
  for (const id of fixtureBusinessIds) {
    await prisma.business.delete({ where: { id } }).catch(() => null);
  }
}

async function main() {
  const identity = await prisma.$queryRaw<Array<{ database: string }>>
    `SELECT current_database() AS database`;
  assert.equal(
    identity[0]?.database,
    "loyalflow_test",
    "Refusing to run outside loyalflow_test."
  );

  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${EXPECTED_PROMOTION_MIGRATION} AND finished_at IS NOT NULL`;
  assert.equal(
    applied.length,
    1,
    "Apply the reviewed promotion migration before running this verifier."
  );

  const business = await prisma.business.create({
    data: {
      name: "LoyalFlow promotion verification",
      slug: `lf-verify-promotion-${runId}`,
      loyaltyMode: "VISITS",
      unitName: "زيارة",
      rewardThreshold: 5,
      earnAmount: 1,
    },
  });
  fixtureBusinessIds.push(business.id);

  const otherBusiness = await prisma.business.create({
    data: {
      name: "LoyalFlow promotion other tenant",
      slug: `lf-verify-promotion-other-${runId}`,
      loyaltyMode: "VISITS",
      unitName: "زيارة",
      rewardThreshold: 5,
      earnAmount: 1,
    },
  });
  fixtureBusinessIds.push(otherBusiness.id);

  const customer = await prisma.customer.create({
    data: {
      firstName: "Promotion",
      lastName: "Verification",
      phone: "+201000000099",
      customerCode: `PROMO-${runId}`,
      businessId: business.id,
    },
  });

  const smaller = await prisma.promotion.create({
    data: {
      name: "Smaller bonus",
      bonusAmount: 2,
      businessId: business.id,
    },
  });
  const selected = await prisma.promotion.create({
      data: {
        name: "Selected bonus",
        bonusAmount: 1,
        bonusMultiplier: 3,
      loyaltyMode: "VISITS",
      businessId: business.id,
    },
  });
  const otherTenant = await prisma.promotion.create({
    data: {
      name: "Other tenant bonus",
      bonusAmount: 50,
      businessId: otherBusiness.id,
    },
  });
  const inactive = await prisma.promotion.create({
    data: {
      name: "Inactive bonus",
      bonusAmount: 100,
      isActive: false,
      businessId: business.id,
    },
  });

  const promotion = selectEligiblePromotion({
    businessId: business.id,
    loyaltyMode: "VISITS",
    transactionAmount: 2,
    promotions: [smaller, selected, otherTenant, inactive],
  });
  assert.equal(promotion?.id, selected.id);

  const balance = await withVerificationTransaction((transaction) =>
    recordLoyaltyEarn(transaction, {
      customerId: customer.id,
      businessId: business.id,
      createdById: undefined,
      amount: 2,
      sourceLoyaltyMode: "VISITS",
      promotion: {
        id: selected.id,
        businessId: business.id,
        // A 3× multiplier on a base amount of 2 adds 4, plus this rule's
        // fixed bonus of 1. The audit row therefore records a bonus of 5.
        bonusAmount: calculatePromotionBonus(selected, 2),
      },
      transactionNote: "Promotion verification earn",
      activityDescription: "Promotion verification earn",
    })
  );
  assert.equal(balance, 7);

  const application = await prisma.promotionApplication.findFirstOrThrow({
    where: {
      businessId: business.id,
      customerId: customer.id,
      promotionId: selected.id,
    },
    include: { transaction: true },
  });
  assert.equal(application.baseAmount, 2);
  assert.equal(application.bonusAmount, 5);
  assert.equal(application.transaction.amount, 7);
  assert.equal(
    await prisma.promotionApplication.count({
      where: { transactionId: application.transactionId },
    }),
    1,
    "A transaction must have exactly one promotion audit application."
  );

  console.log(
    "PASS: loyalflow_test promotion migration and isolated promotion verification completed."
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.stack ?? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
