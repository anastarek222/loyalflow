import { createHash, randomBytes, randomUUID } from "node:crypto";

import prisma from "@/lib/prisma";
import {
  createRecoveryCodes,
  createTotpSecret,
  createTotpUri,
  hashRecoveryCode,
  openTotpSecret,
  sealTotpSecret,
  verifyTotpCode,
} from "@/lib/auth/super-admin-mfa";

const ENROLLMENT_TTL_MS = 15 * 60 * 1000;

function getMfaRootSecret() {
  const value = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!value) throw new Error("MFA encryption root secret is not configured");
  return value;
}

function hashEnrollmentToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function beginSuperAdminMfaEnrollment(input: {
  userId: string;
  email: string;
  now?: Date;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!user || !user.isActive || user.role !== "SUPER_ADMIN") {
    throw new Error("Super Admin MFA enrollment is unavailable");
  }

  const secret = createTotpSecret();
  const sealedSecret = sealTotpSecret(secret, getMfaRootSecret());
  const recoveryCodes = createRecoveryCodes();
  const enrollmentToken = randomBytes(32).toString("base64url");
  const enrollmentTokenHash = hashEnrollmentToken(enrollmentToken);
  const now = input.now ?? new Date();
  const enrollmentExpiresAt = new Date(now.getTime() + ENROLLMENT_TTL_MS);

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.$queryRaw<Array<{ enabledAt: Date | null }>>`
      SELECT "enabledAt"
      FROM "SuperAdminMfa"
      WHERE "userId" = ${user.id}
      FOR UPDATE
    `;

    if (existing[0]?.enabledAt) {
      throw new Error("Super Admin MFA is already enabled");
    }

    await transaction.$executeRaw`
      INSERT INTO "SuperAdminMfa" (
        "userId", "secretCiphertext", "enrollmentTokenHash", "enrollmentExpiresAt",
        "enabledAt", "createdAt", "updatedAt"
      ) VALUES (
        ${user.id}, ${sealedSecret}, ${enrollmentTokenHash}, ${enrollmentExpiresAt},
        NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "secretCiphertext" = EXCLUDED."secretCiphertext",
        "enrollmentTokenHash" = EXCLUDED."enrollmentTokenHash",
        "enrollmentExpiresAt" = EXCLUDED."enrollmentExpiresAt",
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "SuperAdminMfa"."enabledAt" IS NULL
    `;

    await transaction.$executeRaw`
      DELETE FROM "SuperAdminMfaRecoveryCode" WHERE "userId" = ${user.id}
    `;

    for (const code of recoveryCodes) {
      await transaction.$executeRaw`
        INSERT INTO "SuperAdminMfaRecoveryCode" (
          "id", "userId", "codeHash", "usedAt", "createdAt"
        ) VALUES (
          ${randomUUID()}, ${user.id}, ${hashRecoveryCode(code)}, NULL, CURRENT_TIMESTAMP
        )
      `;
    }
  });

  return {
    enrollmentToken,
    enrollmentExpiresAt,
    secret,
    otpauthUri: createTotpUri({ secret, email: input.email }),
    recoveryCodes,
  };
}

export async function enableSuperAdminMfa(input: {
  enrollmentToken: string;
  code: string;
  now?: Date;
}) {
  const tokenHash = hashEnrollmentToken(input.enrollmentToken);
  const now = input.now ?? new Date();
  const rows = await prisma.$queryRaw<
    Array<{ userId: string; secretCiphertext: string }>
  >`
    SELECT "userId", "secretCiphertext"
    FROM "SuperAdminMfa"
    WHERE "enrollmentTokenHash" = ${tokenHash}
      AND "enrollmentExpiresAt" > ${now}
      AND "enabledAt" IS NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return false;

  const secret = openTotpSecret(row.secretCiphertext, getMfaRootSecret());
  if (!verifyTotpCode({ secret, code: input.code, now: now.getTime() })) return false;

  return prisma.$transaction(async (transaction) => {
    const changed = await transaction.$executeRaw`
      UPDATE "SuperAdminMfa"
      SET "enabledAt" = CURRENT_TIMESTAMP,
          "enrollmentTokenHash" = NULL,
          "enrollmentExpiresAt" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${row.userId}
        AND "enrollmentTokenHash" = ${tokenHash}
        AND "enrollmentExpiresAt" > ${now}
        AND "enabledAt" IS NULL
    `;

    if (changed !== 1) return false;

    await transaction.user.update({
      where: { id: row.userId },
      data: { authVersion: { increment: 1 } },
    });

    return true;
  });
}

export async function isSuperAdminMfaEnabled(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ enabled: boolean }>>`
    SELECT ("enabledAt" IS NOT NULL) AS "enabled"
    FROM "SuperAdminMfa"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  return rows[0]?.enabled === true;
}

export async function verifySuperAdminMfa(input: {
  userId: string;
  code: string;
  now?: number;
}) {
  const rows = await prisma.$queryRaw<Array<{ secretCiphertext: string }>>`
    SELECT "secretCiphertext"
    FROM "SuperAdminMfa"
    WHERE "userId" = ${input.userId} AND "enabledAt" IS NOT NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return false;

  const secret = openTotpSecret(row.secretCiphertext, getMfaRootSecret());
  if (verifyTotpCode({ secret, code: input.code, now: input.now })) return true;

  const recoveryHash = hashRecoveryCode(input.code);
  const consumed = await prisma.$executeRaw`
    UPDATE "SuperAdminMfaRecoveryCode"
    SET "usedAt" = CURRENT_TIMESTAMP
    WHERE "userId" = ${input.userId}
      AND "codeHash" = ${recoveryHash}
      AND "usedAt" IS NULL
  `;
  return consumed === 1;
}
