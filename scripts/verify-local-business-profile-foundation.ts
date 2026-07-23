import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  createWithGeneratedSlug,
  getSlugCandidate,
  slugifyBusinessName,
} from "../lib/business-profile";
import { logServerError } from "../lib/server/logging";

const EXPECTED_DATABASE = "loyalflow_test";
const EXPECTED_MIGRATION = "20260721000000_add_business_currency_timezone";
const FIXTURE_PREFIX = "lf-verify-business-profile-";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const parsedDatabaseUrl = new URL(connectionString);
const databaseFromUrl = decodeURIComponent(parsedDatabaseUrl.pathname)
  .replace(/^\//, "")
  .split("/")[0];

assert.equal(
  databaseFromUrl,
  EXPECTED_DATABASE,
  `Refusing to run outside ${EXPECTED_DATABASE}.`
);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const runId = randomUUID().replaceAll("-", "").slice(0, 10);
const businessIds: string[] = [];

async function cleanup() {
  for (const businessId of businessIds) {
    await prisma.business.delete({
      where: { id: businessId },
    }).catch(() => null);
  }
}

async function main() {
  const identity = await prisma.$queryRaw<Array<{ database: string }>>
    `SELECT current_database() AS database`;

  assert.equal(
    identity[0]?.database,
    EXPECTED_DATABASE,
    `Refusing to run outside ${EXPECTED_DATABASE}.`
  );

  const appliedMigration = await prisma.$queryRaw<Array<{ migration_name: string }>>
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${EXPECTED_MIGRATION} AND finished_at IS NOT NULL`;

  assert.equal(
    appliedMigration.length,
    1,
    "Apply the reviewed business-profile migration before running this verifier."
  );

  const existing = await prisma.business.create({
    data: {
      name: `${FIXTURE_PREFIX}existing-${runId}`,
      slug: `${FIXTURE_PREFIX}existing-${runId}`,
    },
  });
  businessIds.push(existing.id);

  const created = await createWithGeneratedSlug(
    `${FIXTURE_PREFIX}same-name-${runId}`,
    (slug) => prisma.business.create({
      data: {
        name: `${FIXTURE_PREFIX}same-name-${runId}`,
        slug,
        contactPhone: "+201000000000",
        currency: "EGP",
        timezone: "Africa/Cairo",
      },
    })
  );
  businessIds.push(created.id);

  const duplicate = await createWithGeneratedSlug(
    `${FIXTURE_PREFIX}same-name-${runId}`,
    (slug) => prisma.business.create({
      data: {
        name: `${FIXTURE_PREFIX}same-name-${runId}`,
        slug,
      },
    })
  );
  businessIds.push(duplicate.id);

  const expectedBaseSlug = slugifyBusinessName(
    `${FIXTURE_PREFIX}same-name-${runId}`
  );

  assert.equal(created.slug, expectedBaseSlug);
  assert.equal(duplicate.slug, getSlugCandidate(expectedBaseSlug, 1));

  const persisted = await prisma.business.findUniqueOrThrow({
    where: { id: created.id },
    select: {
      contactPhone: true,
      currency: true,
      timezone: true,
    },
  });

  assert.deepEqual(persisted, {
    contactPhone: "+201000000000",
    currency: "EGP",
    timezone: "Africa/Cairo",
  });

  const updated = await prisma.business.update({
    where: { id: created.id },
    data: {
      contactPhone: "+201111111111",
      currency: "USD",
      timezone: "America/New_York",
    },
    select: {
      contactPhone: true,
      currency: true,
      timezone: true,
    },
  });

  assert.deepEqual(updated, {
    contactPhone: "+201111111111",
    currency: "USD",
    timezone: "America/New_York",
  });

  const stableExisting = await prisma.business.findUniqueOrThrow({
    where: { id: existing.id },
    select: { slug: true },
  });

  assert.equal(stableExisting.slug, existing.slug);
  console.log("PASS: loyalflow_test business-profile verification completed.");
}

main()
  .catch((error) => {
    logServerError("business_profile_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
