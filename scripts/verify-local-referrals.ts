import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { canRecordReferral } from "../lib/referrals/code";

const EXPECTED_MIGRATION = "20260720220000_add_referral_program";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const runId = randomUUID().replaceAll("-", "").slice(0, 10);
const businessIds: string[] = [];

async function cleanup() {
  for (const businessId of businessIds) {
    await prisma.business.delete({ where: { id: businessId } }).catch(() => null);
  }
}

async function main() {
  const identity = await prisma.$queryRaw<Array<{ database: string }>>
    `SELECT current_database() AS database`;
  assert.equal(identity[0]?.database, "loyalflow_test", "Refusing to run outside loyalflow_test.");
  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${EXPECTED_MIGRATION} AND finished_at IS NOT NULL`;
  assert.equal(applied.length, 1, "Apply the reviewed referral migration before running this verifier.");

  const [business, otherBusiness] = await Promise.all([
    prisma.business.create({ data: { name: "Referral verification", slug: `lf-verify-referral-${runId}`, loyaltyMode: "VISITS" } }),
    prisma.business.create({ data: { name: "Referral other tenant", slug: `lf-verify-referral-other-${runId}`, loyaltyMode: "VISITS" } }),
  ]);
  businessIds.push(business.id, otherBusiness.id);
  const [referrer, referred] = await Promise.all([
    prisma.customer.create({ data: { firstName: "Referrer", phone: `+201${runId.slice(0, 7)}01`, customerCode: `REF-A-${runId}`, businessId: business.id } }),
    prisma.customer.create({ data: { firstName: "Referred", phone: `+201${runId.slice(0, 7)}02`, customerCode: `REF-B-${runId}`, businessId: business.id } }),
  ]);
  const code = await prisma.customerReferralCode.create({
    data: { businessId: business.id, customerId: referrer.id, code: "A1B2C3D4" },
  });
  assert.equal(
    await prisma.customerReferralCode.findFirst({ where: { businessId: otherBusiness.id, code: code.code } }),
    null,
    "A referral code must not resolve in another tenant."
  );
  assert.equal(canRecordReferral({ businessId: business.id, referrerBusinessId: business.id, referrerCustomerId: referrer.id, referredCustomerId: referred.id, referrerIsActive: true }), true);
  assert.equal(canRecordReferral({ businessId: business.id, referrerBusinessId: business.id, referrerCustomerId: referrer.id, referredCustomerId: referrer.id, referrerIsActive: true }), false);

  await prisma.$transaction(async (transaction) => {
    await transaction.referral.create({
      data: { businessId: business.id, referrerCustomerId: referrer.id, referredCustomerId: referred.id },
    });
    await transaction.businessActivity.create({
      data: { type: "REFERRAL_RECORDED", description: "Verification referral", businessId: business.id, customerId: referred.id },
    });
  }, { maxWait: 30_000, timeout: 15_000 });
  assert.equal(await prisma.referral.count({ where: { businessId: business.id, referrerCustomerId: referrer.id, referredCustomerId: referred.id } }), 1);
  assert.equal(await prisma.businessActivity.count({ where: { businessId: business.id, customerId: referred.id, type: "REFERRAL_RECORDED" } }), 1);
  assert.equal(await prisma.loyaltyTransaction.count({ where: { businessId: business.id } }), 0, "Referral recording must not grant loyalty automatically.");
  const balances = await prisma.customer.findMany({ where: { id: { in: [referrer.id, referred.id] } }, select: { balance: true } });
  assert.equal(balances.length, 2);
  assert.ok(balances.every((customer) => customer.balance === 0));
  await assert.rejects(
    prisma.referral.create({ data: { businessId: business.id, referrerCustomerId: referrer.id, referredCustomerId: referred.id } }),
    "A customer can be referred only once within a business."
  );
  console.log("PASS: loyalflow_test referral migration and isolated verification completed.");
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
