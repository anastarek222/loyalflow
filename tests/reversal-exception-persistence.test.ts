import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260807114500_add_reversal_exception_persistence/migration.sql",
  "utf8",
);
const design = readFileSync(
  "docs/database/REVERSAL_EXCEPTION_PERSISTENCE.md",
  "utf8",
);

test("reversal exceptions are a first-class typed persistence model", () => {
  assert.match(schema, /model ReversalException \{/);
  assert.match(schema, /blockReason\s+ReversalExceptionReason/);
  assert.match(schema, /status\s+ReversalExceptionStatus\s+@default\(OPEN\)/);
  assert.match(schema, /reversalKind\s+ReversalKind/);
  assert.match(schema, /operationId\s+String/);
  assert.match(schema, /@@unique\(\[businessId, operationId\]\)/);
  assert.match(schema, /enum ReversalExceptionReason \{[\s\S]*INSUFFICIENT_BALANCE[\s\S]*\}/);
  assert.match(schema, /enum ReversalExceptionStatus \{[\s\S]*OPEN[\s\S]*RESOLVED[\s\S]*\}/);
});

test("reversal exception linkage is tenant-composite and preserves originals", () => {
  assert.match(
    schema,
    /originalTransaction\s+LoyaltyTransaction\s+@relation\("ReversalExceptionOriginalTransaction", fields: \[originalTransactionId, businessId\], references: \[id, businessId\], onDelete: NoAction\)/,
  );
  assert.match(
    schema,
    /customer\s+Customer\s+@relation\(fields: \[customerId, businessId\], references: \[id, businessId\], onDelete: Cascade\)/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \("originalTransactionId", "businessId"\) REFERENCES "LoyaltyTransaction"\("id", "businessId"\)/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \("customerId", "businessId"\) REFERENCES "Customer"\("id", "businessId"\)/,
  );
  assert.doesNotMatch(migration, /UPDATE\s+"LoyaltyTransaction"/i);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+"LoyaltyTransaction"/i);
});

test("migration is additive and creates the exact operational evidence indexes", () => {
  assert.match(
    migration,
    /CREATE TYPE "ReversalExceptionReason" AS ENUM \('INSUFFICIENT_BALANCE'\);/,
  );
  assert.match(
    migration,
    /CREATE TYPE "ReversalExceptionStatus" AS ENUM \('OPEN', 'RESOLVED'\);/,
  );
  assert.match(migration, /CREATE TABLE "ReversalException"/);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "ReversalException_businessId_operationId_key"/,
  );
  assert.match(
    migration,
    /CREATE INDEX "ReversalException_businessId_status_createdAt_idx"/,
  );
  assert.match(
    migration,
    /CREATE INDEX "ReversalException_businessId_customerId_status_createdAt_idx"/,
  );
  assert.match(
    migration,
    /CREATE INDEX "ReversalException_businessId_originalTransactionId_createdAt_idx"/,
  );
});

test("V1 persistence scope is only unresolved insufficient-balance financial blockers", () => {
  assert.match(design, /`INSUFFICIENT_BALANCE` blocker/);
  assert.match(design, /must not create exception rows/);
  assert.match(design, /never changes `Customer\.balance`/);
  assert.match(design, /never creates a `LoyaltyTransaction`/);
  assert.match(design, /No automatic negative-balance debt/);
});
