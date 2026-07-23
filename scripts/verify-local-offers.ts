import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { isOfferEligible } from "../lib/offers/eligibility";
import { logServerError } from "../lib/server/logging";

const EXPECTED_MIGRATION = "20260720260000_add_customer_offers";
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
  const identity = await prisma.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
  assert.equal(identity[0]?.database, "loyalflow_test", "Refusing to run outside loyalflow_test.");
  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${EXPECTED_MIGRATION} AND finished_at IS NOT NULL`;
  assert.equal(applied.length, 1, "Apply the reviewed offers migration before running this verifier.");

  const [business, otherBusiness] = await Promise.all([
    prisma.business.create({ data: { name: "Offers verification", slug: `lf-verify-offers-${runId}`, rewardThreshold: 5 } }),
    prisma.business.create({ data: { name: "Offers other tenant", slug: `lf-verify-offers-other-${runId}` } }),
  ]);
  businessIds.push(business.id, otherBusiness.id);
  const [customer, vipCustomer] = await Promise.all([
    prisma.customer.create({ data: { firstName: "Active", phone: `+201${runId.slice(0, 9)}`, customerCode: `OFFERS-${runId}`, businessId: business.id, balance: 1, lifetimeEarned: 1, createdAt: new Date("2026-05-01T12:00:00.000Z") } }),
    prisma.customer.create({ data: { firstName: "Vip", phone: `+202${runId.slice(0, 9)}`, customerCode: `OFFERS-VIP-${runId}`, businessId: business.id, lifetimeEarned: 25, createdAt: new Date("2026-05-01T12:00:00.000Z") } }),
  ]);
  const now = new Date("2026-07-20T12:00:00.000Z");
  await prisma.loyaltyTransaction.create({ data: { businessId: business.id, customerId: customer.id, type: "EARN", amount: 1, balanceAfter: 1, createdAt: new Date("2026-07-15T12:00:00.000Z") } });
  const [active, inactive, expired, future, segment, vip, other] = await Promise.all([
    prisma.offer.create({ data: { businessId: business.id, name: "Active", validFrom: new Date("2026-07-01T00:00:00.000Z"), validUntil: new Date("2026-07-31T23:59:59.999Z") } }),
    prisma.offer.create({ data: { businessId: business.id, name: "Inactive", isActive: false } }),
    prisma.offer.create({ data: { businessId: business.id, name: "Expired", validUntil: new Date("2026-07-19T23:59:59.999Z") } }),
    prisma.offer.create({ data: { businessId: business.id, name: "Future", validFrom: new Date("2026-07-21T00:00:00.000Z") } }),
    prisma.offer.create({ data: { businessId: business.id, name: "Active segment", eligibility: "SEGMENT", segment: "ACTIVE" } }),
    prisma.offer.create({ data: { businessId: business.id, name: "VIP", eligibility: "VIP" } }),
    prisma.offer.create({ data: { businessId: otherBusiness.id, name: "Other tenant" } }),
  ]);
  const activeCustomer = { businessId: customer.businessId, isActive: customer.isActive, createdAt: customer.createdAt, lifetimeEarned: customer.lifetimeEarned, lastActivityAt: new Date("2026-07-15T12:00:00.000Z") };
  const vipInput = { businessId: vipCustomer.businessId, isActive: vipCustomer.isActive, createdAt: vipCustomer.createdAt, lifetimeEarned: vipCustomer.lifetimeEarned, lastActivityAt: null };
  const businessInput = { id: business.id, rewardThreshold: business.rewardThreshold };
  assert.equal(isOfferEligible(active, activeCustomer, businessInput, now), true);
  assert.equal(isOfferEligible(inactive, activeCustomer, businessInput, now), false);
  assert.equal(isOfferEligible(expired, activeCustomer, businessInput, now), false);
  assert.equal(isOfferEligible(future, activeCustomer, businessInput, now), false);
  assert.equal(isOfferEligible(segment, activeCustomer, businessInput, now), true);
  assert.equal(isOfferEligible(vip, activeCustomer, businessInput, now), false);
  assert.equal(isOfferEligible(vip, vipInput, businessInput, now), true);
  assert.equal(isOfferEligible(other, activeCustomer, businessInput, now), false);
  const unchanged = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id }, select: { balance: true, lifetimeEarned: true, lifetimeRedeemed: true } });
  assert.deepEqual(unchanged, { balance: 1, lifetimeEarned: 1, lifetimeRedeemed: 0 });
  console.log("PASS: loyalflow_test offers migration and isolated verification completed.");
}

main().catch((error) => {
  logServerError("offers_verification_failed", error);
  process.exitCode = 1;
}).finally(async () => {
  await cleanup();
  await prisma.$disconnect();
});
