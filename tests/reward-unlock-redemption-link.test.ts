import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260807182500_add_reward_unlock_redemption_link/migration.sql",
  "utf8",
);
const transactions = readFileSync("lib/loyalty/transactions.ts", "utf8");

test("reward redemption persists one nullable same-tenant unlock identity", () => {
  assert.match(schema, /rewardUnlockId\s+String\?/);
  assert.match(
    schema,
    /rewardUnlock\s+RewardUnlock\?\s+@relation\(fields: \[rewardUnlockId, businessId\], references: \[id, businessId\], onDelete: NoAction\)/,
  );
  assert.match(schema, /@@unique\(\[rewardUnlockId, businessId\]\)/);
  assert.match(schema, /redemption\s+RewardRedemption\?/);
  assert.match(schema, /model RewardUnlock[\s\S]*@@unique\(\[id, businessId\]\)/);
});

test("migration is additive and tenant-composite without guessing legacy provenance", () => {
  assert.match(migration, /ADD COLUMN "rewardUnlockId" TEXT/);
  assert.match(
    migration,
    /FOREIGN KEY \("rewardUnlockId", "businessId"\)[\s\S]*REFERENCES "RewardUnlock"\("id", "businessId"\)/,
  );
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "RewardRedemption_rewardUnlockId_businessId_key"/,
  );
  assert.doesNotMatch(migration, /UPDATE "RewardRedemption"/);
  assert.doesNotMatch(migration, /DROP (TABLE|COLUMN|CONSTRAINT)/);
});

test("redemption idempotency treats the unlock as immutable financial intent", () => {
  assert.match(
    transactions,
    /rewardUnlockId:\s*true/,
  );
  assert.match(
    transactions,
    /existing\.rewardRedemption\?\.rewardUnlockId\s*!==\s*\(input\.unlockId\s*\?\?\s*null\)/,
  );
});

test("successful unlock redemption stores the exact claimed unlock", () => {
  assert.match(
    transactions,
    /rewardUnlockId:\s*input\.unlockId/,
  );
});
