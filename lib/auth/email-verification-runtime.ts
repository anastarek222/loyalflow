import type {
  EmailVerificationTokenRecord,
  VerifyEmailResult,
} from "@/lib/auth/email-verification";
import {
  createEmailVerificationToken,
  verifyEmailWithStore,
} from "@/lib/auth/email-verification";
import prisma from "@/lib/prisma";

export async function issueEmailVerificationToken(input: {
  userId: string;
  now?: Date;
}) {
  const token = createEmailVerificationToken(input.now);

  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      INSERT INTO "EmailVerificationState" (
        "userId", "verifiedAt", "createdAt", "updatedAt"
      )
      VALUES (${input.userId}, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId") DO UPDATE SET
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    await transaction.$executeRaw`
      INSERT INTO "EmailVerificationToken" (
        "id", "userId", "tokenHash", "expiresAt", "usedAt", "createdAt"
      )
      VALUES (
        ${token.id}, ${input.userId}, ${token.tokenHash}, ${token.expiresAt}, NULL, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "id" = EXCLUDED."id",
        "tokenHash" = EXCLUDED."tokenHash",
        "expiresAt" = EXCLUDED."expiresAt",
        "usedAt" = NULL,
        "createdAt" = CURRENT_TIMESTAMP
    `;
  });

  return token;
}

export async function markEmailVerified(input: {
  userId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  await prisma.$executeRaw`
    INSERT INTO "EmailVerificationState" (
      "userId", "verifiedAt", "createdAt", "updatedAt"
    )
    VALUES (${input.userId}, ${now}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId") DO UPDATE SET
      "verifiedAt" = COALESCE("EmailVerificationState"."verifiedAt", EXCLUDED."verifiedAt"),
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

export async function verifyEmail(input: {
  token: string;
  now?: Date;
}): Promise<VerifyEmailResult> {
  return verifyEmailWithStore(input, {
    async findTokenByHash(tokenHash) {
      const rows = await prisma.$queryRaw<EmailVerificationTokenRecord[]>`
        SELECT "id", "userId", "tokenHash", "expiresAt", "usedAt"
        FROM "EmailVerificationToken"
        WHERE "tokenHash" = ${tokenHash}
        LIMIT 1
      `;

      return rows[0] ?? null;
    },

    async consumeAndVerify(atomicInput) {
      return prisma.$transaction(async (transaction) => {
        const consumed = await transaction.$executeRaw`
          UPDATE "EmailVerificationToken"
          SET "usedAt" = ${atomicInput.now}
          WHERE "id" = ${atomicInput.tokenId}
            AND "userId" = ${atomicInput.userId}
            AND "tokenHash" = ${atomicInput.expectedTokenHash}
            AND "usedAt" IS NULL
            AND "expiresAt" > ${atomicInput.now}
        `;

        if (consumed !== 1) {
          return { status: "invalid_or_expired" as const };
        }

        await transaction.$executeRaw`
          INSERT INTO "EmailVerificationState" (
            "userId", "verifiedAt", "createdAt", "updatedAt"
          )
          VALUES (
            ${atomicInput.userId}, ${atomicInput.now}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT ("userId") DO UPDATE SET
            "verifiedAt" = COALESCE("EmailVerificationState"."verifiedAt", EXCLUDED."verifiedAt"),
            "updatedAt" = CURRENT_TIMESTAMP
        `;

        return {
          status: "success" as const,
          userId: atomicInput.userId,
        };
      });
    },
  });
}
