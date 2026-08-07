import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { compare, hash } from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import {
  consumePasswordResetToken,
  hashPasswordResetToken,
  issuePasswordResetToken,
  PasswordResetError,
} from "../lib/auth/password-reset";
import { logServerError } from "../lib/server/logging";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const fixtureEmails: string[] = [];

async function cleanup() {
  if (fixtureEmails.length === 0) return;

  await prisma.user.deleteMany({
    where: {
      email: {
        in: fixtureEmails,
      },
    },
  });
}

async function main() {
  const database = await prisma.$queryRaw<{ database: string }[]>`
    SELECT current_database() AS database
  `;

  assert.equal(
    database[0]?.database,
    "loyalflow_test",
    "Refusing to run password-reset verification outside loyalflow_test.",
  );

  const migration = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = '20260807191500_add_password_reset_tokens'
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  `;

  assert.equal(
    migration[0]?.migration_name,
    "20260807191500_add_password_reset_tokens",
    "Required password-reset migration is not applied.",
  );

  const email = `password-reset-${runId}@example.test`;
  fixtureEmails.push(email);

  const initialPassword = `Initial-${runId}-Password`;
  const initialPasswordHash = await hash(initialPassword, 12);

  const user = await prisma.user.create({
    data: {
      firstName: "Password",
      lastName: "Reset",
      email,
      passwordHash: initialPasswordHash,
      role: "SUPER_ADMIN",
      authVersion: 7,
    },
    select: {
      id: true,
      authVersion: true,
    },
  });

  const firstIssue = await issuePasswordResetToken({ userId: user.id });
  assert.ok(firstIssue.token.length >= 40);

  const persistedFirst = await prisma.passwordResetToken.findUniqueOrThrow({
    where: {
      tokenHash: hashPasswordResetToken(firstIssue.token),
    },
    select: {
      tokenHash: true,
      usedAt: true,
      expiresAt: true,
    },
  });

  assert.equal(persistedFirst.tokenHash, hashPasswordResetToken(firstIssue.token));
  assert.equal(persistedFirst.usedAt, null);
  assert.ok(persistedFirst.expiresAt > new Date());
  assert.notEqual(persistedFirst.tokenHash, firstIssue.token);
  console.log("PASS A: issued reset persists only the token hash with a future expiry.");

  const secondIssue = await issuePasswordResetToken({ userId: user.id });
  const revokedFirst = await prisma.passwordResetToken.findUniqueOrThrow({
    where: {
      tokenHash: hashPasswordResetToken(firstIssue.token),
    },
    select: { usedAt: true },
  });
  assert.ok(revokedFirst.usedAt instanceof Date);
  console.log("PASS B: issuing a new reset revokes the prior unused token.");

  const newPassword = `Updated-${runId}-Password`;
  const consumed = await consumePasswordResetToken({
    token: secondIssue.token,
    newPassword,
  });
  assert.equal(consumed.userId, user.id);

  const updatedUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      passwordHash: true,
      authVersion: true,
    },
  });

  assert.equal(updatedUser.authVersion, user.authVersion + 1);
  assert.equal(await compare(newPassword, updatedUser.passwordHash), true);
  assert.equal(await compare(initialPassword, updatedUser.passwordHash), false);
  console.log("PASS C: reset changes the password and increments authVersion.");

  await assert.rejects(
    () =>
      consumePasswordResetToken({
        token: secondIssue.token,
        newPassword: `Again-${runId}-Password`,
      }),
    (error: unknown) =>
      error instanceof PasswordResetError &&
      error.reason === "INVALID_OR_EXPIRED_TOKEN",
  );

  const afterReplay = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { authVersion: true },
  });
  assert.equal(afterReplay.authVersion, user.authVersion + 1);
  console.log("PASS D: the same reset token cannot be consumed twice.");

  const expiredIssue = await issuePasswordResetToken({ userId: user.id });
  const expiredNow = new Date(expiredIssue.expiresAt.getTime());

  await assert.rejects(
    () =>
      consumePasswordResetToken({
        token: expiredIssue.token,
        newPassword: `Expired-${runId}-Password`,
        now: expiredNow,
      }),
    (error: unknown) =>
      error instanceof PasswordResetError &&
      error.reason === "INVALID_OR_EXPIRED_TOKEN",
  );

  const afterExpiry = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { authVersion: true },
  });
  assert.equal(afterExpiry.authVersion, user.authVersion + 1);
  console.log("PASS E: exact-expiry reset tokens are rejected without changing credentials.");
}

main()
  .catch((error: unknown) => {
    logServerError("password_reset_runtime_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
