import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chmod, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import { PrismaClient } from "../generated/prisma/client";
import { logServerError } from "../lib/server/logging";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function getTestPassword() {
  const value = process.env.UAT_FIXTURE_PASSWORD;

  if (!value || value.length < 10) {
    throw new Error(
      "UAT_FIXTURE_PASSWORD must be set to a disposable password of at least 10 characters."
    );
  }

  return value;
}

const testPassword = getTestPassword();
const PREFIX = "lf-uat-final-";
const BUSINESS_NAME_PREFIX = "LoyalFlow final UAT ";
const REQUIRED_MIGRATION = "20260723054319_link_reward_redemption_to_ledger";
const args = process.argv.slice(2);
const cleanupArgument = args.find((argument) =>
  argument.startsWith("--cleanup=")
);
const baseUrlArgument = args.find((argument) =>
  argument.startsWith("--base-url=")
);
const suppliedRunId = args.find((argument) =>
  argument.startsWith("--run=")
);
const manifestArgument = args.find((argument) =>
  argument.startsWith("--manifest=")
);
const runId = (cleanupArgument ?? suppliedRunId)?.split("=", 2)[1] ??
  randomUUID().replaceAll("-", "").slice(0, 10);
let cleanupAttempted = false;

function uatBusinessUserEmails(run: string) {
  return new Set([
    "owner-a",
    "manager-a",
    "staff-a",
    "viewer-a",
    "inactive-user",
    "owner-b",
    "owner-sales",
    "inactive-owner",
  ].map((role) => `lf-uat-final-${role}-${run}@example.test`));
}

function assertSafeRunId(value: string) {
  assert.match(
    value,
    /^[a-f0-9]{8,24}$/,
    "Run ID must be the hexadecimal ID printed by this fixture command."
  );
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function buildBaseUrl() {
  const value = baseUrlArgument?.split("=", 2)[1] ??
    process.env.UAT_BASE_URL ??
    "http://localhost:3000";
  const url = new URL(value);

  assert.ok(
    url.protocol === "http:" || url.protocol === "https:",
    "UAT base URL must use HTTP or HTTPS."
  );

  return url.toString().replace(/\/$/, "");
}

function slug(label: string) {
  return `${PREFIX}${label}-${runId}`;
}

function publicEnrollmentPhone(run: string) {
  // Browser UAT creates ten-hex-character run IDs. Converting that complete
  // value to a padded decimal string is injective, so the public enrollment
  // phone is deterministic, unique per run, numeric-only, and stays within
  // the production validator's 15-digit E.164-compatible limit.
  assert.match(
    run,
    /^[a-f0-9]{10}$/,
    "Browser UAT requires the generated ten-character hexadecimal run ID."
  );

  return `+20${BigInt(`0x${run}`).toString().padStart(13, "0")}`;
}

async function assertSafeDatabaseTarget() {
  const identity = await prisma.$queryRaw<Array<{ database: string }>>
    `SELECT current_database() AS database`;

  assert.equal(
    identity[0]?.database,
    "loyalflow_test",
    "Refusing to create UAT fixtures outside the explicit loyalflow_test database."
  );

  const migration = await prisma.$queryRaw<Array<{ migration_name: string }>>
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${REQUIRED_MIGRATION} AND finished_at IS NOT NULL`;

  assert.equal(
    migration.length,
    1,
    "The reviewed current schema must be applied before creating final UAT fixtures."
  );
}

async function cleanup(run: string) {
  assert.ok(!cleanupAttempted, "Final UAT cleanup has already been attempted.");
  cleanupAttempted = true;
  assertSafeRunId(run);

  const businesses = await prisma.business.findMany({
    where: {
      slug: {
        startsWith: PREFIX,
        endsWith: `-${run}`,
      },
      name: {
        startsWith: BUSINESS_NAME_PREFIX,
      },
    },
    select: { id: true },
  });

  const businessIds = businesses.map((business) => business.id);

  await prisma.$transaction(async (transaction) => {
    if (businessIds.length) {
      const uatUsers = await transaction.user.findMany({
        where: {
          businessId: { in: businessIds },
        },
        select: { id: true, email: true },
      });
      const uatUserIds = uatUsers.map((user) => user.id);
      const expectedUatUserEmails = uatBusinessUserEmails(run);
      assert.ok(
        uatUsers.every((user) => expectedUatUserEmails.has(user.email)),
        "Refusing to clean a UAT business with an unexpected user."
      );
      const businessScope = { businessId: { in: businessIds } };

      // Delete explicit dependents before the UAT users and businesses. Several
      // of these relations intentionally use NoAction to preserve production
      // audit history, so relying on a business cascade is not safe here.
      await transaction.notificationItemRead.deleteMany({ where: businessScope });
      await transaction.notificationReadState.deleteMany({ where: businessScope });
      await transaction.notification.deleteMany({ where: businessScope });
      await transaction.customerNote.deleteMany({ where: businessScope });
      await transaction.businessActivity.deleteMany({ where: businessScope });
      await transaction.rewardRedemption.deleteMany({ where: businessScope });
      await transaction.promotionApplication.deleteMany({ where: businessScope });
      await transaction.loyaltyTransaction.deleteMany({ where: businessScope });
      await transaction.rewardUnlock.deleteMany({ where: businessScope });
      await transaction.customerTagAssignment.deleteMany({ where: businessScope });
      await transaction.customerReferralCode.deleteMany({ where: businessScope });
      await transaction.referral.deleteMany({ where: businessScope });
      await transaction.branchStaffAssignment.deleteMany({ where: businessScope });
      await transaction.customer.deleteMany({ where: businessScope });
      await transaction.reward.deleteMany({ where: businessScope });
      await transaction.promotion.deleteMany({ where: businessScope });
      await transaction.customerTag.deleteMany({ where: businessScope });
      await transaction.offer.deleteMany({ where: businessScope });
      await transaction.branch.deleteMany({ where: businessScope });

      if (uatUserIds.length) {
        await transaction.user.deleteMany({ where: { id: { in: uatUserIds } } });
      }
      await transaction.business.deleteMany({ where: { id: { in: businessIds } } });
    }

    await transaction.user.deleteMany({
      where: {
        email: `lf-uat-final-superadmin-${run}@example.test`,
        role: "SUPER_ADMIN",
        businessId: null,
      },
    });
  }, {
    maxWait: 10_000,
    timeout: 60_000,
  });

  console.log(
    `CLEANUP COMPLETE: removed ${businesses.length} final UAT business fixture(s) for run ${run}.`
  );
}

async function createBusiness(input: {
  label: string;
  name: string;
  loyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT";
  rewardThreshold: number;
  earnAmount: number;
  isActive?: boolean;
  cardDefaultLanguage?: "AR" | "EN";
}) {
  const business = await prisma.business.create({
    data: {
      name: `${BUSINESS_NAME_PREFIX}${input.name}`,
      slug: slug(input.label),
      loyaltyMode: input.loyaltyMode,
      unitName: input.loyaltyMode === "SALES_AMOUNT" ? "EGP" : "Points",
      loyaltyProgramName: `Final UAT ${input.loyaltyMode}`,
      rewardName: `Legacy ${input.loyaltyMode} reward`,
      rewardDescription: "Disposable final UAT legacy reward",
      rewardThreshold: input.rewardThreshold,
      earnAmount: input.earnAmount,
      allowOwnerDataExport: true,
      cardDefaultLanguage: input.cardDefaultLanguage ?? "EN",
      isActive: input.isActive ?? true,
    },
  });

  return business;
}

async function createCustomer(input: {
  businessId: string;
  key: string;
  phone: string;
  isActive?: boolean;
  balance?: number;
  lifetimeEarned?: number;
  lifetimeRedeemed?: number;
  createdAt?: Date;
}) {
  return prisma.customer.create({
    data: {
      firstName: "Final UAT",
      lastName: input.key,
      phone: input.phone,
      customerCode: `UAT-${input.key.toUpperCase()}-${runId}`,
      businessId: input.businessId,
      isActive: input.isActive ?? true,
      balance: input.balance ?? 0,
      lifetimeEarned: input.lifetimeEarned ?? 0,
      lifetimeRedeemed: input.lifetimeRedeemed ?? 0,
      createdAt: input.createdAt,
    },
  });
}

async function createTransaction(input: {
  businessId: string;
  customer: { id: string; businessId: string };
  amount: number;
  balanceAfter: number;
  loyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT";
  createdAt: Date;
  saleAmount?: number;
}) {
  assert.equal(
    input.customer.businessId,
    input.businessId,
    "Every seeded loyalty transaction customer must belong to the same business."
  );

  return prisma.loyaltyTransaction.create({
    data: {
      businessId: input.businessId,
      customerId: input.customer.id,
      type: "EARN",
      amount: input.amount,
      balanceAfter: input.balanceAfter,
      sourceLoyaltyMode: input.loyaltyMode,
      saleAmount: input.saleAmount,
      note: "Disposable final UAT seeded activity",
      createdAt: input.createdAt,
    },
  });
}

function printFixtureDetails(input: {
  baseUrl: string;
  businessA: { slug: string };
  businessB: { slug: string };
  businessSales: { slug: string };
  activeCustomer: { id: string };
  otherCustomer: { id: string };
  staffBranchId: string;
}) {
  const url = (path: string) => `${input.baseUrl}${path}`;

  console.log("\nFINAL UAT FIXTURES READY");
  console.log(`Run ID: ${runId}`);
  console.log("Database guard: loyalflow_test only");
  console.log("Shared disposable password: supplied securely outside this script");
  console.log("\nLogin accounts:");
  console.log(`  Owner A: lf-uat-final-owner-a-${runId}@example.test`);
  console.log(`  Manager A: lf-uat-final-manager-a-${runId}@example.test`);
  console.log(`  Staff A: lf-uat-final-staff-a-${runId}@example.test`);
  console.log(`  Viewer A: lf-uat-final-viewer-a-${runId}@example.test`);
  console.log(`  Inactive user: lf-uat-final-inactive-user-${runId}@example.test`);
  console.log(`  Owner B: lf-uat-final-owner-b-${runId}@example.test`);
  console.log(`  Owner Sales: lf-uat-final-owner-sales-${runId}@example.test`);
  console.log(`  Inactive business owner: lf-uat-final-inactive-owner-${runId}@example.test`);
  console.log(`  Super admin: lf-uat-final-superadmin-${runId}@example.test`);
  console.log("\nRoutes:");
  console.log(`  Login: ${url("/login")}`);
  console.log(`  A customers (VISITS): ${url(`/businesses/${input.businessA.slug}/customers`)}`);
  console.log(`  A rewards: ${url(`/businesses/${input.businessA.slug}/rewards`)}`);
  console.log(`  A offers: ${url(`/businesses/${input.businessA.slug}/offers`)}`);
  console.log(`  A reports: ${url(`/businesses/${input.businessA.slug}/reports`)}`);
  console.log(`  A users: ${url(`/businesses/${input.businessA.slug}/users`)}`);
  console.log(`  A activity: ${url(`/businesses/${input.businessA.slug}/activity`)}`);
  console.log(`  A duplicates: ${url(`/businesses/${input.businessA.slug}/duplicates`)}`);
  console.log(`  B customers (POINTS): ${url(`/businesses/${input.businessB.slug}/customers`)}`);
  console.log(`  Sales customers: ${url(`/businesses/${input.businessSales.slug}/customers`)}`);
  console.log("  A public card: available to the browser UAT manifest only");
  console.log("  A public card API: available to the browser UAT manifest only");
  console.log(`  B negative customer ID: ${input.otherCustomer.id}`);
  console.log(`  A staff assigned branch ID: ${input.staffBranchId}`);
  console.log("\nFixture test identifiers:");
  console.log("  A-01,A-02,A-03,B-01,B-02,C-01,C-03,C-05,D-01,D-02,D-03,E-01,F-01,G-01,H-01,H-02,I-01,J-01,K-01,L-01,M-01,N-01,O-01,P-01,Q-01,R-01,S-01");
  console.log(`\nCleanup: npm run cleanup:final-uat -- --run=${runId}`);
}

async function writeBrowserManifest(input: {
  businessA: { slug: string };
  businessB: { slug: string };
  activeCustomer: { id: string; publicToken: string; customerCode: string };
  vipCustomer: { id: string; publicToken: string };
  otherCustomer: { id: string; publicToken: string };
  staffBranchId: string;
}) {
  if (!manifestArgument) return;

  const manifestPath = resolve(manifestArgument.split("=", 2)[1] ?? "");
  assert.ok(manifestPath, "Browser UAT manifest path is required.");

  // This deliberately contains no password. It is consumed only by the
  // current Playwright process and is removed by its fixture teardown.
  await writeFile(
    manifestPath,
    JSON.stringify({
      runId,
      businessA: input.businessA.slug,
      businessB: input.businessB.slug,
      activeCustomer: input.activeCustomer,
      vipCustomer: input.vipCustomer,
      otherCustomer: input.otherCustomer,
      staffBranchId: input.staffBranchId,
      publicEnrollmentPhone: publicEnrollmentPhone(runId),
    }),
    { mode: 0o600 }
  );
  await chmod(manifestPath, 0o600);
}

async function prepareFixtures() {
  assertSafeRunId(runId);
  const baseUrl = buildBaseUrl();
  const passwordHash = await hash(testPassword, 12);

  // Print the cleanup handle before the first write so an interrupted run is
  // still recoverable without discovering or touching unrelated records.
  console.log(`Preparing final UAT run ${runId}. Cleanup handle: --run=${runId}`);

  const [businessA, businessB, businessSales, inactiveBusiness] = await Promise.all([
    createBusiness({ label: "a", name: "Business A VISITS", loyaltyMode: "VISITS", rewardThreshold: 5, earnAmount: 1 }),
    createBusiness({ label: "b", name: "Business B POINTS", loyaltyMode: "POINTS", rewardThreshold: 10, earnAmount: 1, cardDefaultLanguage: "AR" }),
    createBusiness({ label: "sales", name: "Business Sales", loyaltyMode: "SALES_AMOUNT", rewardThreshold: 100, earnAmount: 1 }),
    createBusiness({ label: "inactive", name: "Inactive business", loyaltyMode: "VISITS", rewardThreshold: 5, earnAmount: 1, isActive: false }),
  ]);

  const createdUsers = await Promise.all([
    prisma.user.create({ data: { firstName: "Final UAT Owner A", email: `lf-uat-final-owner-a-${runId}@example.test`, passwordHash, role: "OWNER", businessId: businessA.id, language: "EN", experienceAccess: "BOTH" } }),
    prisma.user.create({ data: { firstName: "Final UAT Manager A", email: `lf-uat-final-manager-a-${runId}@example.test`, passwordHash, role: "MANAGER", businessId: businessA.id, language: "EN" } }),
    prisma.user.create({ data: { firstName: "Final UAT Staff A", email: `lf-uat-final-staff-a-${runId}@example.test`, passwordHash, role: "STAFF", businessId: businessA.id } }),
    prisma.user.create({ data: { firstName: "Final UAT Viewer A", email: `lf-uat-final-viewer-a-${runId}@example.test`, passwordHash, role: "VIEWER", businessId: businessA.id, language: "EN" } }),
    prisma.user.create({ data: { firstName: "Final UAT Inactive User", email: `lf-uat-final-inactive-user-${runId}@example.test`, passwordHash, role: "STAFF", businessId: businessA.id, isActive: false } }),
    prisma.user.create({ data: { firstName: "Final UAT Owner B", email: `lf-uat-final-owner-b-${runId}@example.test`, passwordHash, role: "OWNER", businessId: businessB.id } }),
    prisma.user.create({ data: { firstName: "Final UAT Owner Sales", email: `lf-uat-final-owner-sales-${runId}@example.test`, passwordHash, role: "OWNER", businessId: businessSales.id } }),
    prisma.user.create({ data: { firstName: "Final UAT Inactive Owner", email: `lf-uat-final-inactive-owner-${runId}@example.test`, passwordHash, role: "OWNER", businessId: inactiveBusiness.id } }),
    prisma.user.create({ data: { firstName: "Final UAT Super Admin", email: `lf-uat-final-superadmin-${runId}@example.test`, passwordHash, role: "SUPER_ADMIN", language: "EN" } }),
  ]);
  const ownerA = createdUsers[0]!;
  const staffA = createdUsers[2]!;

  const [branchOne, branchTwo] = await Promise.all([
    prisma.branch.create({ data: { businessId: businessA.id, name: "Final UAT A Branch One", address: "Fixture only" } }),
    prisma.branch.create({ data: { businessId: businessA.id, name: "Final UAT A Branch Two", address: "Fixture only" } }),
    prisma.branch.create({ data: { businessId: businessA.id, name: "Final UAT A Inactive Branch", isActive: false } }),
  ]);

  await prisma.branchStaffAssignment.createMany({
    data: [
      { businessId: businessA.id, branchId: branchOne.id, userId: staffA.id },
      { businessId: businessA.id, branchId: branchTwo.id, userId: staffA.id },
    ],
  });

  const activeCustomer = await createCustomer({
    businessId: businessA.id,
    key: "active",
    phone: `+20100${runId.slice(0, 8)}`,
    balance: 4,
    lifetimeEarned: 4,
    createdAt: daysAgo(90),
  });
  const atRiskCustomer = await createCustomer({
    businessId: businessA.id,
    key: "at-risk",
    phone: `+20200${runId.slice(0, 8)}`,
    balance: 1,
    lifetimeEarned: 1,
    createdAt: daysAgo(90),
  });
  await createCustomer({
    businessId: businessA.id,
    key: "inactive",
    phone: `+20300${runId.slice(0, 8)}`,
    isActive: false,
    createdAt: daysAgo(100),
  });
  const vipCustomer = await createCustomer({
    businessId: businessA.id,
    key: "vip",
    phone: `+20400${runId.slice(0, 8)}`,
    balance: 5,
    lifetimeEarned: 25,
    createdAt: daysAgo(100),
  });
  await Promise.all([
    createCustomer({ businessId: businessA.id, key: "duplicate-one", phone: `+20 100 555 ${runId.slice(0, 4)}`, createdAt: daysAgo(50) }),
    createCustomer({ businessId: businessA.id, key: "duplicate-two", phone: `0100555${runId.slice(0, 4)}`, createdAt: daysAgo(49) }),
  ]);
  const otherCustomer = await createCustomer({
    businessId: businessB.id,
    key: "points",
    phone: `+20500${runId.slice(0, 8)}`,
    balance: 9,
    lifetimeEarned: 9,
    createdAt: daysAgo(90),
  });
  const salesCustomer = await createCustomer({
    businessId: businessSales.id,
    key: "sales",
    phone: `+20600${runId.slice(0, 8)}`,
    balance: 90,
    lifetimeEarned: 100,
    createdAt: daysAgo(90),
  });

  await Promise.all([
    createTransaction({ businessId: businessA.id, customer: activeCustomer, amount: 4, balanceAfter: 4, loyaltyMode: "VISITS", createdAt: daysAgo(5) }),
    createTransaction({ businessId: businessA.id, customer: atRiskCustomer, amount: 1, balanceAfter: 1, loyaltyMode: "VISITS", createdAt: daysAgo(45) }),
    createTransaction({ businessId: businessA.id, customer: vipCustomer, amount: 25, balanceAfter: 5, loyaltyMode: "VISITS", createdAt: daysAgo(3) }),
    createTransaction({ businessId: businessB.id, customer: otherCustomer, amount: 9, balanceAfter: 9, loyaltyMode: "POINTS", createdAt: daysAgo(4) }),
    createTransaction({ businessId: businessSales.id, customer: salesCustomer, amount: 100, balanceAfter: 90, loyaltyMode: "SALES_AMOUNT", saleAmount: 1_000, createdAt: daysAgo(2) }),
  ]);

  const [standardReward, expiringReward] = await Promise.all([
    prisma.reward.create({ data: { businessId: businessA.id, name: "Final UAT active reward", description: "No expiry", cost: 5 } }),
    prisma.reward.create({ data: { businessId: businessA.id, name: "Final UAT expiring reward", description: "One-day expiry", cost: 5, expiresAfterDays: 1 } }),
    prisma.reward.create({ data: { businessId: businessA.id, name: "Final UAT inactive reward", cost: 5, isActive: false } }),
    prisma.reward.create({ data: { businessId: businessB.id, name: "Final UAT B reward", cost: 10 } }),
  ]);

  await Promise.all([
    prisma.rewardUnlock.create({ data: { businessId: businessA.id, customerId: vipCustomer.id, rewardId: standardReward.id, unlockedAt: daysAgo(1), expiresAt: daysAgo(-30) } }),
    prisma.rewardUnlock.create({ data: { businessId: businessA.id, customerId: vipCustomer.id, rewardId: expiringReward.id, unlockedAt: daysAgo(3), expiresAt: daysAgo(2), expiredAt: daysAgo(2) } }),
  ]);

  await Promise.all([
    prisma.promotion.create({ data: { businessId: businessA.id, name: "Final UAT fixed bonus", bonusAmount: 2, isActive: false, loyaltyMode: "VISITS" } }),
    prisma.promotion.create({ data: { businessId: businessA.id, name: "Final UAT multiplier", bonusAmount: 0, bonusMultiplier: 2, isActive: false, loyaltyMode: "VISITS" } }),
    prisma.promotion.create({ data: { businessId: businessA.id, name: "Final UAT expired promotion", bonusAmount: 5, isActive: true, endsAt: daysAgo(1) } }),
    prisma.promotion.create({ data: { businessId: businessB.id, name: "Final UAT B promotion", bonusAmount: 10 } }),
    prisma.offer.create({ data: { businessId: businessA.id, name: "Final UAT active offer", description: "Fixture-only public offer" } }),
    prisma.offer.create({ data: { businessId: businessA.id, name: "Final UAT future offer", validFrom: daysAgo(-7) } }),
    prisma.offer.create({ data: { businessId: businessB.id, name: "Final UAT B offer" } }),
  ]);

  const tag = await prisma.customerTag.create({
    data: { businessId: businessA.id, name: "Final UAT VIP" },
  });
  await Promise.all([
    prisma.customerTagAssignment.create({ data: { businessId: businessA.id, customerId: activeCustomer.id, tagId: tag.id } }),
    prisma.customerNote.create({ data: { businessId: businessA.id, customerId: activeCustomer.id, content: "Private final UAT fixture note — must never appear on the public card.", createdById: ownerA.id, updatedById: ownerA.id } }),
    prisma.customerReferralCode.create({ data: { businessId: businessA.id, customerId: activeCustomer.id, code: `UAT${runId.slice(0, 6).toUpperCase()}` } }),
  ]);

  printFixtureDetails({
    baseUrl,
    businessA,
    businessB,
    businessSales,
    activeCustomer,
    otherCustomer,
    staffBranchId: branchOne.id,
  });

  await writeBrowserManifest({
    businessA,
    businessB,
    activeCustomer,
    vipCustomer,
    otherCustomer,
    staffBranchId: branchOne.id,
  });
}

async function main() {
  await assertSafeDatabaseTarget();

  if (cleanupArgument) {
    await cleanup(runId);
    return;
  }

  await prepareFixtures();
}

main()
  .catch(async (error) => {
    logServerError("prepare_final_uat_fixtures_failed", error);
    process.exitCode = 1;

    if (!cleanupAttempted) {
      await cleanup(runId);
    }
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
