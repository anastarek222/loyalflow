import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  LoyaltyMode,
  Prisma,
  PrismaClient,
  RewardType,
} from "../generated/prisma/client";
import { logServerError } from "../lib/server/logging";
import {
  generateCustomerCode,
  parseCustomerRegistration,
} from "../lib/customers/registration";
import { calculateRetentionScore } from "../lib/customers/retention-score";
import {
  getCustomerSegment,
  getCustomerSegmentWhere,
} from "../lib/customers/segments";
import { buildCustomerTimeline } from "../lib/customers/timeline";
import {
  recordBalanceAdjustment,
  recordLoyaltyEarn,
  recordRewardRedemption,
} from "../lib/loyalty/transactions";
import { getAvailableRewardOptions } from "../lib/rewards/catalog";

const REVIEWED_MIGRATIONS = [
  "20260709205131_initial_loyalty_schema",
  "20260711020806_add_business_activity_log",
  "20260711022533_add_team_account_security",
  "20260711023407_add_whatsapp_templates",
  "20260711051230_add_business_card_details",
  "20260712163422_add_notification_read_state",
  "20260712210443_add_individual_notification_reads",
  "20260713182630_add_owner_export_permission",
  "20260713184228_add_app_languages",
  "20260714003329_add_sales_loyalty_and_reward_types",
  "20260718143000_add_white_label_mvp_fields",
  "20260720170000_add_reward_catalog",
  "20260720180000_add_transaction_mode_provenance",
  "20260720190000_add_loyalty_promotions",
  "20260720200000_add_earn_idempotency_and_promotion_multiplier",
  "20260720210000_add_reward_expiration",
  "20260720220000_add_referral_program",
  "20260720230000_add_manager_and_viewer_roles",
  "20260720240000_add_multi_branch_foundation",
  "20260720250000_add_customer_notes_and_tags",
  "20260720260000_add_customer_offers",
  "20260721000000_add_business_currency_timezone",
  "20260721031502_add_business_profile_fields",
  "20260721170000_add_staff_attribution_foundation",
  "20260722075434_add_theme_notifications_audit",
  "20260722085251_add_business_employee_count",
  "20260722224333_add_business_qr_position",
  "20260723044900_enforce_tenant_composite_foreign_keys",
  "20260723054319_link_reward_redemption_to_ledger",
  "20260723103415_add_branch_audit_activity_types",
  "20260723120000_add_owner_phone",
  "20260724090000_add_experience_access",
] as const;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const fixtureBusinessIds: string[] = [];
const runId = randomUUID().replaceAll("-", "").slice(0, 12);

// Neon poolers can take longer than Prisma's default 2-second acquisition
// window when other local connections are active. These options apply only to
// this isolated verifier; transaction callbacks contain database writes only.
const verificationTransactionOptions = {
  maxWait: 30_000,
  timeout: 15_000,
} as const;

async function withVerificationTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(operation, verificationTransactionOptions);
}

function fixtureSlug(label: string) {
  return `lf-verify-${label}-${runId}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

async function createFixtureBusiness(
  label: string,
  loyaltyMode: LoyaltyMode
) {
  const business = await prisma.business.create({
    data: {
      name: `LoyalFlow verification ${label}`,
      slug: fixtureSlug(label),
      loyaltyMode,
      unitName: loyaltyMode === "SALES_AMOUNT" ? "جنيه" : "نقطة",
      rewardName: "Legacy verification reward",
      rewardThreshold: 5,
      earnAmount: 1,
    },
  });

  fixtureBusinessIds.push(business.id);
  return business;
}

async function createCustomer(
  businessId: string,
  customerCode: string,
  phone: string,
  createdAt = new Date()
) {
  return prisma.customer.create({
    data: {
      firstName: "Verification",
      lastName: customerCode,
      phone,
      customerCode,
      businessId,
      createdAt,
    },
  });
}

async function verifyMigrationHistory() {
  const identity = await prisma.$queryRaw<
    Array<{ database: string }>
  >`SELECT current_database() AS database`;

  assert.equal(
    identity[0]?.database,
    "loyalflow_test",
    "Refusing to run outside the explicit loyalflow_test database."
  );

  const applied = await prisma.$queryRaw<
    Array<{ migration_name: string }>
  >`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name`;

  const migrationNames = applied.map((migration) => migration.migration_name);

  assert.ok(
    JSON.stringify(migrationNames) === JSON.stringify(REVIEWED_MIGRATIONS),
    "Migration history must exactly match the reviewed migration history."
  );
}

async function verifyCustomerCreationAndSelfSignup() {
  const business = await createFixtureBusiness("join", "VISITS");
  const staffCreated = await createCustomer(
    business.id,
    `STAFF-${runId}`,
    "+201000000001"
  );

  assert.equal(staffCreated.businessId, business.id);

  const parsed = parseCustomerRegistration({
    firstName: "  QR Customer ",
    lastName: " Join ",
    phone: "+20 100 000 0002",
  });
  assert.ok(parsed, "QR self-signup input should parse.");

  const customerCode = await generateCustomerCode(
    prisma,
    business.id,
    business.slug
  );
  const joined = await withVerificationTransaction(async (transaction) => {
    const customer = await transaction.customer.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName || null,
        phone: parsed.phone,
        customerCode,
        businessId: business.id,
      },
    });

    await transaction.businessActivity.create({
      data: {
        type: "CUSTOMER_CREATED",
        description: "Verification QR self-signup",
        businessId: business.id,
        customerId: customer.id,
      },
    });

    return customer;
  });

  assert.ok(joined.publicToken, "Self-signed customer must have a public token.");
  assert.equal(
    await prisma.businessActivity.count({
      where: {
        businessId: business.id,
        customerId: joined.id,
        type: "CUSTOMER_CREATED",
      },
    }),
    1
  );

  return { business, joined };
}

async function verifyLoyaltyAndTenantIsolation() {
  const visits = await createFixtureBusiness("visits", "VISITS");
  const points = await createFixtureBusiness("points", "POINTS");
  const sales = await createFixtureBusiness("sales", "SALES_AMOUNT");
  const customer = await createCustomer(
    visits.id,
    `VISIT-${runId}`,
    "+201000000010"
  );

  const earnedBalance = await withVerificationTransaction((transaction) =>
    recordLoyaltyEarn(transaction, {
      customerId: customer.id,
      businessId: visits.id,
      createdById: undefined,
      amount: 5,
      sourceLoyaltyMode: "VISITS",
      transactionNote: "Verification visit earn",
      activityDescription: "Verification visit earn",
    })
  );
  assert.equal(earnedBalance, 5);

  const blockedCrossTenantEarn = await withVerificationTransaction((transaction) =>
    recordLoyaltyEarn(transaction, {
      customerId: customer.id,
      businessId: points.id,
      createdById: undefined,
      amount: 1,
      sourceLoyaltyMode: "POINTS",
      transactionNote: "Cross tenant verification",
      activityDescription: "Cross tenant verification",
    })
  );
  assert.equal(blockedCrossTenantEarn, null);

  const pointsCustomer = await createCustomer(
    points.id,
    `POINT-${runId}`,
    "+201000000011"
  );
  const pointsBalance = await withVerificationTransaction((transaction) =>
    recordLoyaltyEarn(transaction, {
      customerId: pointsCustomer.id,
      businessId: points.id,
      createdById: undefined,
      amount: 3,
      sourceLoyaltyMode: "POINTS",
      transactionNote: "Verification points earn",
      activityDescription: "Verification points earn",
    })
  );
  assert.equal(pointsBalance, 3);

  const salesCustomer = await createCustomer(
    sales.id,
    `SALE-${runId}`,
    "+201000000012"
  );
  const salesBalance = await withVerificationTransaction((transaction) =>
    recordLoyaltyEarn(transaction, {
      customerId: salesCustomer.id,
      businessId: sales.id,
      createdById: undefined,
      amount: 250,
      sourceLoyaltyMode: "SALES_AMOUNT",
      saleAmount: 250,
      transactionNote: "Verification sale earn",
      activityDescription: "Verification sale earn",
    })
  );
  assert.equal(salesBalance, 250);

  const saleRecord = await prisma.loyaltyTransaction.findFirstOrThrow({
    where: {
      businessId: sales.id,
      customerId: salesCustomer.id,
      type: "EARN",
    },
  });
  assert.equal(saleRecord.sourceLoyaltyMode, "SALES_AMOUNT");
  assert.equal(saleRecord.saleAmount, 250);

  const adjustmentBalance = await withVerificationTransaction((transaction) =>
    recordBalanceAdjustment(transaction, {
      customerId: customer.id,
      businessId: visits.id,
      createdById: undefined,
      direction: "SUBTRACT",
      amount: 1,
      reason: "Verification adjustment",
    })
  );
  assert.equal(adjustmentBalance, 4);

  return { visits, points, sales, customer };
}

async function verifyRewardsAndRedemption(
  businessId: string,
  customerId: string
) {
  const reward = await prisma.reward.create({
    data: {
      name: "Verification selected reward",
      description: "Created by isolated database verification",
      type: RewardType.PROMO_CODE,
      code: "VERIFY25",
      cost: 3,
      businessId,
    },
  });

  const updated = await prisma.reward.updateMany({
    where: { id: reward.id, businessId },
    data: { name: "Verification edited reward", cost: 4 },
  });
  assert.equal(updated.count, 1);

  const activeReward = await prisma.reward.findFirst({
    where: { id: reward.id, businessId, isActive: true },
  });
  assert.ok(activeReward, "Selected active reward must be available.");

  const redemptionBalance = await withVerificationTransaction((transaction) =>
    recordRewardRedemption(transaction, {
      customerId,
      businessId,
      createdById: undefined,
      cost: activeReward.cost,
      rewardName: activeReward.name,
      rewardLabel: `${activeReward.name} — ${activeReward.code}`,
      rewardId: activeReward.id,
    })
  );
  assert.equal(redemptionBalance, 0);

  const redemption = await prisma.rewardRedemption.findFirstOrThrow({
    where: { businessId, customerId, rewardId: reward.id },
  });
  assert.equal(redemption.cost, 4);

  const deactivated = await prisma.reward.updateMany({
    where: { id: reward.id, businessId },
    data: { isActive: false },
  });
  assert.equal(deactivated.count, 1);
  assert.equal(
    await prisma.reward.findFirst({
      where: { id: reward.id, businessId, isActive: true },
    }),
    null,
    "Inactive rewards must not satisfy the server action's selection predicate."
  );

  const fallbackBusiness = await createFixtureBusiness("legacy", "POINTS");
  const fallback = getAvailableRewardOptions([], {
    name: fallbackBusiness.rewardName,
    description: fallbackBusiness.rewardDescription,
    type: fallbackBusiness.rewardType,
    code: fallbackBusiness.rewardCode,
    cost: fallbackBusiness.rewardThreshold,
  });
  assert.deepEqual(fallback, [
    {
      id: null,
      name: fallbackBusiness.rewardName,
      description: fallbackBusiness.rewardDescription,
      type: fallbackBusiness.rewardType,
      code: fallbackBusiness.rewardCode,
      cost: fallbackBusiness.rewardThreshold,
    },
  ]);
}

async function verifyTimelineSegmentationAndRetention(
  businessId: string,
  customerId: string
) {
  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { businessId, customerId },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });
  const lifecycle = await prisma.businessActivity.findMany({
    where: {
      businessId,
      customerId,
      type: {
        in: [
          "CUSTOMER_CREATED",
          "CUSTOMER_UPDATED",
          "CUSTOMER_DEACTIVATED",
          "CUSTOMER_REACTIVATED",
        ],
      },
    },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });
  const timeline = buildCustomerTimeline(transactions, lifecycle);
  assert.equal(timeline.length, transactions.length + lifecycle.length);
  assert.ok(timeline.some((item) => item.kind === "transaction"));

  const now = new Date();
  const oldCustomer = await createCustomer(
    businessId,
    `RISK-${runId}`,
    "+201000000013",
    daysAgo(90)
  );
  await prisma.loyaltyTransaction.create({
    data: {
      type: "EARN",
      amount: 1,
      balanceAfter: 1,
      customerId: oldCustomer.id,
      businessId,
      sourceLoyaltyMode: "VISITS",
      createdAt: daysAgo(45),
    },
  });

  const atRisk = await prisma.customer.findMany({
    where: {
      businessId,
      ...getCustomerSegmentWhere("AT_RISK", 5, now),
    },
  });
  assert.ok(atRisk.some((customer) => customer.id === oldCustomer.id));

  const currentCustomer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
  });
  assert.equal(
    getCustomerSegment(
      {
        isActive: currentCustomer.isActive,
        createdAt: currentCustomer.createdAt,
        lastActivityAt: new Date(),
        lifetimeEarned: currentCustomer.lifetimeEarned,
        rewardThreshold: 5,
      },
      now
    ),
    "NEW"
  );

  const retention = calculateRetentionScore({
    now,
    createdAt: currentCustomer.createdAt,
    lastActivityAt: new Date(),
    transactionCount: transactions.length,
    lifetimeEarned: currentCustomer.lifetimeEarned,
    lifetimeRedeemed: currentCustomer.lifetimeRedeemed,
    balance: currentCustomer.balance,
    loyaltyMode: "VISITS",
    earnAmount: 1,
    rewardThreshold: 5,
  });
  assert.ok(retention.score >= 0 && retention.score <= 100);
}

async function cleanup() {
  for (const id of fixtureBusinessIds) {
    await prisma.business.delete({ where: { id } }).catch(() => null);
  }
}

async function main() {
  await verifyMigrationHistory();
  const { business: joinBusiness, joined } =
    await verifyCustomerCreationAndSelfSignup();
  assert.equal(joined.businessId, joinBusiness.id);

  const { visits, customer } = await verifyLoyaltyAndTenantIsolation();
  await verifyRewardsAndRedemption(visits.id, customer.id);
  await verifyTimelineSegmentationAndRetention(visits.id, customer.id);

  console.log(
    "PASS: loyalflow_test migration history and isolated database verification completed."
  );
}

main()
  .catch((error) => {
    logServerError("local_database_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
