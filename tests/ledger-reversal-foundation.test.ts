import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260807064000_add_ledger_reversal_link/migration.sql",
  "utf8",
);

test("ledger schema exposes typed reversal semantics without replacing historical transaction types", () => {
  assert.match(schema, /enum TransactionType\s*\{[\s\S]*\bREVERSAL\b[\s\S]*\}/);
  assert.match(
    schema,
    /enum ReversalKind\s*\{[\s\S]*EARN_REFUND[\s\S]*EARN_VOID[\s\S]*REDEMPTION_REVERSAL[\s\S]*\}/,
  );
  assert.match(schema, /reversalOfTransactionId\s+String\?/);
  assert.match(schema, /reversalKind\s+ReversalKind\?/);
  assert.match(schema, /reversalReason\s+String\?/);
});

test("reversal linkage is tenant-composite and supports multiple compensations per original transaction", () => {
  assert.match(
    schema,
    /reversalOf\s+LoyaltyTransaction\?\s+@relation\("LoyaltyTransactionReversals",\s*fields:\s*\[reversalOfTransactionId,\s*businessId\],\s*references:\s*\[id,\s*businessId\]/,
  );
  assert.match(
    schema,
    /reversals\s+LoyaltyTransaction\[\]\s+@relation\("LoyaltyTransactionReversals"\)/,
  );
  assert.match(
    schema,
    /@@index\(\[businessId,\s*reversalOfTransactionId,\s*createdAt\]\)/,
  );
});

test("forward-only migration adds typed metadata and a same-tenant foreign key", () => {
  assert.match(migration, /ADD VALUE IF NOT EXISTS 'REVERSAL'/);
  assert.match(migration, /CREATE TYPE "ReversalKind" AS ENUM/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "reversalOfTransactionId" TEXT/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "reversalKind" "ReversalKind"/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "reversalReason" TEXT/);
  assert.match(
    migration,
    /FOREIGN KEY \("reversalOfTransactionId", "businessId"\)[\s\S]*REFERENCES "LoyaltyTransaction"\("id", "businessId"\)/,
  );
  assert.match(migration, /LoyaltyTransaction_reversal_metadata_check/);
});

test("foundation remains additive and does not implement refund writes", () => {
  assert.doesNotMatch(migration, /DELETE FROM "LoyaltyTransaction"/i);
  assert.doesNotMatch(migration, /UPDATE "LoyaltyTransaction"/i);
  assert.doesNotMatch(migration, /DROP (TABLE|COLUMN|TYPE)/i);
});
