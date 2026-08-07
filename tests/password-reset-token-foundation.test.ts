import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260807191500_add_password_reset_tokens/migration.sql",
  "utf8",
);

test("password reset persistence stores only a hash and single-use lifecycle evidence", () => {
  assert.match(schema, /model PasswordResetToken \{/);
  assert.match(schema, /userId\s+String/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(schema, /expiresAt\s+DateTime/);
  assert.match(schema, /usedAt\s+DateTime\?/);
  assert.doesNotMatch(schema, /\btoken\s+String/);
});

test("password reset tokens are owned by one user and cascade only with that user", () => {
  assert.match(schema, /passwordResetTokens\s+PasswordResetToken\[\]/);
  assert.match(
    schema,
    /user\s+User\s+@relation\(fields: \[userId\], references: \[id\], onDelete: Cascade\)/,
  );
  assert.match(schema, /@@index\(\[userId, expiresAt, usedAt\]\)/);
});

test("password reset migration is additive and never stores plaintext reset tokens", () => {
  assert.match(migration, /CREATE TABLE "PasswordResetToken"/);
  assert.match(migration, /"tokenHash" TEXT NOT NULL/);
  assert.match(migration, /CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"/);
  assert.match(migration, /FOREIGN KEY \("userId"\) REFERENCES "User"\("id"\)/);
  assert.doesNotMatch(migration, /"token" TEXT/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|ALTER COLUMN/);
});
