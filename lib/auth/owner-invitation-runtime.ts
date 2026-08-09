import { hash } from "bcryptjs";

import {
  redeemOwnerInvitationWithStore,
  type OwnerInvitationRecord,
  type RedeemOwnerInvitationResult,
} from "@/lib/auth/owner-invitation";
import { passwordValueSchema } from "@/lib/auth/password-policy";
import { isUniqueConstraintError } from "@/lib/business-profile";
import prisma from "@/lib/prisma";

export class OwnerInvitationRedemptionError extends Error {
  constructor(public readonly reason: "INVALID_PASSWORD") {
    super(reason);
    this.name = "OwnerInvitationRedemptionError";
  }
}

export async function redeemOwnerInvitation(input: {
  token: string;
  password: string;
  now?: Date;
}): Promise<RedeemOwnerInvitationResult> {
  const parsedPassword = passwordValueSchema.safeParse(input.password);
  if (!parsedPassword.success) {
    throw new OwnerInvitationRedemptionError("INVALID_PASSWORD");
  }

  const passwordHash = await hash(parsedPassword.data, 12);

  try {
    return await redeemOwnerInvitationWithStore(
      {
        token: input.token,
        passwordHash,
        now: input.now,
      },
      {
        async findInvitationByTokenHash(tokenHash) {
          const rows = await prisma.$queryRaw<OwnerInvitationRecord[]>`
            SELECT
              "id",
              "firstName",
              "lastName",
              "email",
              "tokenHash",
              "expiresAt",
              "usedAt"
            FROM "OwnerInvitation"
            WHERE "tokenHash" = ${tokenHash}
            LIMIT 1
          `;

          return rows[0] ?? null;
        },

        async findUserByEmail(email) {
          return prisma.user.findUnique({
            where: { email },
            select: { id: true },
          });
        },

        async consumeAndCreateOwner(atomicInput) {
          return prisma.$transaction(async (transaction) => {
            const consumed = await transaction.$executeRaw`
              UPDATE "OwnerInvitation"
              SET "usedAt" = ${atomicInput.now}
              WHERE "id" = ${atomicInput.invitationId}
                AND "tokenHash" = ${atomicInput.expectedTokenHash}
                AND "usedAt" IS NULL
                AND "expiresAt" > ${atomicInput.now}
            `;

            if (consumed !== 1) {
              return { status: "invalid_or_expired" as const };
            }

            const owner = await transaction.user.create({
              data: atomicInput.owner,
              select: { id: true },
            });

            await transaction.$executeRaw`
              INSERT INTO "EmailVerificationState" (
                "userId", "verifiedAt", "createdAt", "updatedAt"
              )
              VALUES (
                ${owner.id}, ${atomicInput.now}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
              )
              ON CONFLICT ("userId") DO UPDATE SET
                "verifiedAt" = COALESCE("EmailVerificationState"."verifiedAt", EXCLUDED."verifiedAt"),
                "updatedAt" = CURRENT_TIMESTAMP
            `;

            return {
              status: "success" as const,
              userId: owner.id,
            };
          });
        },
      },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { status: "email_unavailable" };
    }

    throw error;
  }
}
