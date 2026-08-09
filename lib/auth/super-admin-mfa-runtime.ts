import { randomUUID } from "node:crypto";

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

function getMfaRootSecret() {
  const value = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!value) throw new Error("MFA encryption root secret is not configured");
  return value;
}

export async function beginSuperAdminMfaEnrollment(input: {
  userId: string;
  email: string;
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

  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      INSERT INTO "SuperAdminMfa" (
        "userId", "secretCiphertext", "enabledAt", "createdAt", "updatedAt"
      ) VALUES (
        ${user.id}, ${sealedSecret}, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "secretCiphertext" = EXCLUDED."secretCiphertext",
        "enabledAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
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
    secret,
    otpauthUri: createTotpUri({ secret, email: input.email }),
    recoveryCodes,
  };
}

export async function enableSuperAdminMfa(input: {
  userId: string;
  code: string;
  now?: number;
}) {
  const rows = await prisma.$queryRaw<Array<{ secretCiphertext: string }>>`
    SELECT "secretCiphertext"
    FROM "SuperAdminMfa"
    WHERE "userId" = ${input.userId} AND "enabledAt" IS NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return false;

  const secret = openTotpSecret(row.secretCiphertext, getMfaRootSecret());
  if (!verifyTotpCode({ secret, code: input.code, now: input.now })) return false;

  const changed = await prisma.$executeRaw`
    UPDATE "SuperAdminMfa"
    SET "enabledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "userId" = ${input.userId} AND "enabledAt" IS NULL
  `;
  return changed === 1;
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
