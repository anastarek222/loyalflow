import "dotenv/config";

import assert from "node:assert/strict";

import { del, list } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";
import { assertDatabaseScriptEnvironment } from "../lib/server/database-script-guard";

const connectionString = process.env.DATABASE_URL;
const stagingFixture = process.env.LOYALFLOW_ENVIRONMENT === "staging";
assertDatabaseScriptEnvironment(
  stagingFixture ? "staging-seed-fixture" : "seed-fixture",
);

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const cleanupArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--cleanup="));
const runId = cleanupArgument?.split("=", 2)[1] ?? "";

assert.match(
  runId,
  /^[a-f0-9]{8,24}$/,
  "Run ID must be the hexadecimal ID printed by the final UAT fixture command.",
);

const PREFIX = "lf-uat-final-";
const BUSINESS_NAME_PREFIX = "LoyalFlow final UAT ";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function assertSafeDatabaseTarget() {
  const identity = await prisma.$queryRaw<Array<{ database: string }>>
    `SELECT current_database() AS database`;
  const expectedDatabase = stagingFixture
    ? process.env.LOYALFLOW_STAGING_DATABASE?.trim()
    : "loyalflow_test";

  assert.ok(
    expectedDatabase,
    "LOYALFLOW_STAGING_DATABASE is required for staging fixture cleanup.",
  );
  assert.equal(
    identity[0]?.database,
    expectedDatabase,
    stagingFixture
      ? "Refusing to clean UAT artwork outside the explicit staging database."
      : "Refusing to clean UAT artwork outside the explicit loyalflow_test database.",
  );
}

async function deleteBusinessArtwork(businessId: string) {
  const prefix = `custom-card/${businessId}/`;
  let cursor: string | undefined;
  let removed = 0;

  do {
    const result = await list({ prefix, limit: 100, cursor });
    const urls = result.blobs
      .filter((blob) => blob.pathname.startsWith(prefix))
      .map((blob) => blob.url);

    if (urls.length) {
      await del(urls);
      removed += urls.length;
    }

    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  return removed;
}

async function main() {
  await assertSafeDatabaseTarget();

  const businesses = await prisma.business.findMany({
    where: {
      slug: {
        startsWith: PREFIX,
        endsWith: `-${runId}`,
      },
      name: {
        startsWith: BUSINESS_NAME_PREFIX,
      },
    },
    select: { id: true, slug: true },
  });

  assert.ok(
    businesses.every((business) => business.slug.startsWith(PREFIX)),
    "Refusing to clean Custom Card artwork for a non-UAT business.",
  );

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    console.log(
      `CUSTOM CARD CLEANUP COMPLETE: Blob storage is not configured; no UAT artwork could have been uploaded for run ${runId}.`,
    );
    return;
  }

  let removed = 0;
  for (const business of businesses) {
    removed += await deleteBusinessArtwork(business.id);
  }

  console.log(
    `CUSTOM CARD CLEANUP COMPLETE: removed ${removed} UAT Blob object(s) across ${businesses.length} final UAT business fixture(s) for run ${runId}.`,
  );
}

main()
  .catch((error) => {
    console.error(
      `CUSTOM CARD CLEANUP FAILED: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
