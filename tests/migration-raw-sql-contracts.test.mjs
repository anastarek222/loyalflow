import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

function normalizeSql(sql) {
  return sql.trim().replace(/\s+/g, " ");
}

function extractEnumValues(schema, enumName) {
  const match = schema.match(
    new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\}`)
  );

  assert.ok(match, `Missing Prisma enum: ${enumName}`);

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[0]);
}

const rewardExpirationMigration = read(
  "prisma/migrations/20260720210000_add_reward_expiration/migration.sql"
);

const tenantFkMigration = read(
  "prisma/migrations/20260723044900_enforce_tenant_composite_foreign_keys/migration.sql"
);

const subscriptionMigration = read(
  "prisma/migrations/20260726224500_add_subscription_plan_entitlements/migration.sql"
);

const loyaltyAndRewardMigration = read(
  "prisma/migrations/20260714003329_add_sales_loyalty_and_reward_types/migration.sql"
);

const initialMigration = read(
  "prisma/migrations/20260709205131_initial_loyalty_schema/migration.sql"
);

const multiBranchMigration = read(
  "prisma/migrations/20260720240000_add_multi_branch_foundation/migration.sql"
);

const customerNotesMigration = read(
  "prisma/migrations/20260720250000_add_customer_notes_and_tags/migration.sql"
);

const referralMigration = read(
  "prisma/migrations/20260720220000_add_referral_program/migration.sql"
);

const rewardLedgerMigration = read(
  "prisma/migrations/20260723054319_link_reward_redemption_to_ledger/migration.sql"
);

const earnIdempotencyMigration = read(
  "prisma/migrations/20260720200000_add_earn_idempotency_and_promotion_multiplier/migration.sql"
);

const notificationReadsMigration = read(
  "prisma/migrations/20260712210443_add_individual_notification_reads/migration.sql"
);

const experienceAccessMigration = read(
  "prisma/migrations/20260724090000_add_experience_access/migration.sql"
);

const rolesMigration = read(
  "prisma/migrations/20260720230000_add_manager_and_viewer_roles/migration.sql"
);

const ledgerReversalMigration = read(
  "prisma/migrations/20260807064000_add_ledger_reversal_link/migration.sql"
);

const schema = read("prisma/schema.prisma");

test("RewardUnlock keeps one live unlock per customer and reward", () => {
  const expected = normalizeSql(`
    CREATE UNIQUE INDEX "RewardUnlock_one_live_per_customer_reward"
      ON "RewardUnlock"("customerId", "rewardId")
      WHERE "redeemedAt" IS NULL AND "expiredAt" IS NULL;
  `);

  assert.ok(
    normalizeSql(rewardExpirationMigration).includes(expected),
    "Missing or changed RewardUnlock partial unique index contract."
  );
});

test("tenant composite foreign-key migration contains the 23 required constraints", () => {
  const expectedConstraints = [
    "CustomerNote_createdById_businessId_fkey",
    "CustomerNote_updatedById_businessId_fkey",
    "LoyaltyTransaction_branchId_businessId_fkey",
    "LoyaltyTransaction_createdById_businessId_fkey",
    "LoyaltyTransaction_attributedStaffId_businessId_fkey",
    "LoyaltyTransaction_customerId_businessId_fkey",
    "PromotionApplication_promotionId_businessId_fkey",
    "PromotionApplication_customerId_businessId_fkey",
    "PromotionApplication_transactionId_businessId_fkey",
    "RewardRedemption_branchId_businessId_fkey",
    "RewardRedemption_createdById_businessId_fkey",
    "RewardRedemption_attributedStaffId_businessId_fkey",
    "RewardRedemption_customerId_businessId_fkey",
    "RewardRedemption_rewardId_businessId_fkey",
    "RewardUnlock_customerId_businessId_fkey",
    "RewardUnlock_rewardId_businessId_fkey",
    "CustomerReferralCode_customerId_businessId_fkey",
    "Referral_referrerCustomerId_businessId_fkey",
    "Referral_referredCustomerId_businessId_fkey",
    "BusinessActivity_branchId_businessId_fkey",
    "BusinessActivity_createdById_businessId_fkey",
    "BusinessActivity_customerId_businessId_fkey",
    "Notification_userId_businessId_fkey",
  ];

  const compositeMatches = [
    ...tenantFkMigration.matchAll(
      /ADD CONSTRAINT "([^"]+)" FOREIGN KEY \("([^"]+)", "businessId"\) REFERENCES "([^"]+)"\("id", "businessId"\)/g
    ),
  ];

  assert.equal(
    compositeMatches.length,
    23,
    "Expected exactly 23 tenant composite foreign keys."
  );

  const actualNames = compositeMatches
    .map((match) => match[1])
    .sort();

  assert.deepEqual(
    actualNames,
    [...expectedConstraints].sort(),
    "Tenant composite foreign-key names changed."
  );
});

test("critical tenant-scoped unique indexes remain present", () => {
  const expectedIndexes = [
    [
      initialMigration,
      'CREATE UNIQUE INDEX "Customer_businessId_phone_key" ON "Customer"("businessId", "phone");',
    ],
    [
      initialMigration,
      'CREATE UNIQUE INDEX "Customer_businessId_customerCode_key" ON "Customer"("businessId", "customerCode");',
    ],
    [
      multiBranchMigration,
      'CREATE UNIQUE INDEX "Branch_businessId_name_key" ON "Branch"("businessId", "name");',
    ],
    [
      multiBranchMigration,
      'CREATE UNIQUE INDEX "Branch_id_businessId_key" ON "Branch"("id", "businessId");',
    ],
    [
      multiBranchMigration,
      'CREATE UNIQUE INDEX "User_id_businessId_key" ON "User"("id", "businessId");',
    ],
    [
      customerNotesMigration,
      'CREATE UNIQUE INDEX "Customer_id_businessId_key" ON "Customer"("id", "businessId");',
    ],
    [
      customerNotesMigration,
      'CREATE UNIQUE INDEX "CustomerTag_businessId_name_key" ON "CustomerTag"("businessId", "name");',
    ],
    [
      customerNotesMigration,
      'CREATE UNIQUE INDEX "CustomerTag_id_businessId_key" ON "CustomerTag"("id", "businessId");',
    ],
    [
      referralMigration,
      'CREATE UNIQUE INDEX "CustomerReferralCode_businessId_customerId_key"',
    ],
    [
      referralMigration,
      'CREATE UNIQUE INDEX "CustomerReferralCode_businessId_code_key"',
    ],
    [
      referralMigration,
      'CREATE UNIQUE INDEX "Referral_businessId_referredCustomerId_key"',
    ],
    [
      notificationReadsMigration,
      'CREATE UNIQUE INDEX "NotificationItemRead_userId_businessId_notificationKey_key" ON "NotificationItemRead"("userId", "businessId", "notificationKey");',
    ],
    [
      rewardLedgerMigration,
      'CREATE UNIQUE INDEX "RewardRedemption_transactionId_businessId_key" ON "RewardRedemption"("transactionId", "businessId");',
    ],
    [
      earnIdempotencyMigration,
      'CREATE UNIQUE INDEX "LoyaltyTransaction_businessId_idempotencyKey_key"',
    ],
    [
      tenantFkMigration,
      'CREATE UNIQUE INDEX "LoyaltyTransaction_id_businessId_key" ON "LoyaltyTransaction"("id", "businessId");',
    ],
    [
      tenantFkMigration,
      'CREATE UNIQUE INDEX "Promotion_id_businessId_key" ON "Promotion"("id", "businessId");',
    ],
    [
      tenantFkMigration,
      'CREATE UNIQUE INDEX "PromotionApplication_transactionId_businessId_key" ON "PromotionApplication"("transactionId", "businessId");',
    ],
    [
      tenantFkMigration,
      'CREATE UNIQUE INDEX "Reward_id_businessId_key" ON "Reward"("id", "businessId");',
    ],
  ];

  for (const [source, expected] of expectedIndexes) {
    assert.ok(
      source.includes(expected),
      `Missing or changed unique index: ${expected}`
    );
  }
});

test("critical Prisma enum values remain exact", () => {
  const expectedEnums = {
    UserRole: [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
      "STAFF",
      "VIEWER",
    ],
    ExperienceAccess: [
      "SIMPLE_ONLY",
      "ADVANCED_ONLY",
      "BOTH",
    ],
    LoyaltyMode: [
      "VISITS",
      "POINTS",
      "SALES_AMOUNT",
    ],
    SubscriptionPlan: [
      "FREE",
      "STARTER",
      "PRO",
      "BUSINESS",
    ],
    TransactionType: [
      "EARN",
      "REDEEM",
      "ADJUSTMENT",
      "REVERSAL",
    ],
    ReversalKind: [
      "EARN_REFUND",
      "EARN_VOID",
      "REDEMPTION_REVERSAL",
    ],
    RewardType: [
      "GIFT",
      "PROMO_CODE",
      "DISCOUNT",
      "CUSTOM",
    ],
  };

  for (const [enumName, expectedValues] of Object.entries(expectedEnums)) {
    assert.deepEqual(
      extractEnumValues(schema, enumName),
      expectedValues,
      `Prisma enum ${enumName} changed.`
    );
  }
});

test("ActivityType keeps required operational values", () => {
  const requiredValues = [
    "CUSTOMER_CREATED",
    "CUSTOMER_UPDATED",
    "LOYALTY_EARNED",
    "REWARD_REDEEMED",
    "REWARD_UNLOCKED",
    "REWARD_EXPIRED",
    "REWARD_REDEMPTION_BLOCKED",
    "REFERRAL_RECORDED",
    "BALANCE_ADJUSTED",
    "USER_PASSWORD_CHANGED",
    "USER_EXPERIENCE_ACCESS_UPDATED",
    "REWARD_CREATED",
    "REWARD_UPDATED",
    "REWARD_STATUS_CHANGED",
    "OFFER_CREATED",
    "OFFER_UPDATED",
    "OFFER_STATUS_CHANGED",
    "BRANCH_CREATED",
    "BRANCH_UPDATED",
    "BRANCH_ACTIVATED",
    "BRANCH_DEACTIVATED",
    "BRANCH_STAFF_ASSIGNED",
    "BRANCH_STAFF_REMOVED",
  ];

  const actualValues = extractEnumValues(schema, "ActivityType");

  for (const value of requiredValues) {
    assert.ok(
      actualValues.includes(value),
      `ActivityType is missing ${value}.`
    );
  }
});

test("migration history preserves later enum additions", () => {
  assert.match(
    rolesMigration,
    /ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';/
  );

  assert.match(
    rolesMigration,
    /ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VIEWER';/
  );

  assert.match(
    experienceAccessMigration,
    /CREATE TYPE "ExperienceAccess" AS ENUM \('SIMPLE_ONLY', 'ADVANCED_ONLY', 'BOTH'\);/
  );

  assert.match(
    loyaltyAndRewardMigration,
    /ALTER TYPE "LoyaltyMode"\s+ADD VALUE IF NOT EXISTS 'SALES_AMOUNT';/
  );

  assert.match(
    normalizeSql(loyaltyAndRewardMigration),
    /CREATE TYPE "RewardType" AS ENUM \( 'GIFT', 'PROMO_CODE', 'DISCOUNT', 'CUSTOM' \);/
  );

  assert.match(
    normalizeSql(subscriptionMigration),
    /CREATE TYPE "SubscriptionPlan" AS ENUM \( 'FREE', 'STARTER', 'PRO', 'BUSINESS' \);/
  );

  assert.match(
    ledgerReversalMigration,
    /ALTER TYPE "TransactionType"\s+ADD VALUE IF NOT EXISTS 'REVERSAL';/
  );

  assert.match(
    normalizeSql(ledgerReversalMigration),
    /CREATE TYPE "ReversalKind" AS ENUM \( 'EARN_REFUND', 'EARN_VOID', 'REDEMPTION_REVERSAL' \);/
  );
});
