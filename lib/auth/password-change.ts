import type { ActivityRequestContext } from "@/lib/activity/request-context";
import { buildSelfPasswordChangeActivity } from "@/lib/auth/password-change-activity";
import {
  changePasswordWithStore,
  type PasswordChangeResult,
} from "@/lib/auth/password-change-core";
import { persistPasswordChangeWithinTransaction } from "@/lib/auth/password-change-persistence";
import prisma from "@/lib/prisma";

type PasswordChangeActor = {
  id: string;
  businessId: string | null;
  email?: string | null;
};

export async function changeAuthenticatedUserPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  actor: PasswordChangeActor;
  activityContext: ActivityRequestContext;
}): Promise<PasswordChangeResult> {
  return changePasswordWithStore(input, {
    findUserById(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          passwordHash: true,
          authVersion: true,
          language: true,
          businessId: true,
          isActive: true,
          business: {
            select: {
              isActive: true,
            },
          },
        },
      });
    },

    async commitPasswordChange({
      userId,
      businessId,
      passwordHash,
      expectedPasswordHash,
      expectedAuthVersion,
    }) {
      const usedAt = new Date();

      return prisma.$transaction(async (transaction) => {
        return persistPasswordChangeWithinTransaction(
          {
            userId,
            businessId,
            passwordHash,
            expectedPasswordHash,
            expectedAuthVersion,
            usedAt,
          },
          {
            async conditionalUpdateUser(conditionalInput) {
              const updated = await transaction.user.updateMany({
                where: {
                  id: conditionalInput.userId,
                  businessId: conditionalInput.businessId,
                  isActive: true,
                  passwordHash: conditionalInput.expectedPasswordHash,
                  authVersion: conditionalInput.expectedAuthVersion,
                },
                data: {
                  passwordHash: conditionalInput.passwordHash,
                  authVersion: {
                    increment: 1,
                  },
                },
              });

              return updated.count;
            },
            async invalidateResetTokens(tokenInput) {
              await transaction.passwordResetToken.updateMany({
                where: {
                  userId: tokenInput.userId,
                  usedAt: null,
                },
                data: {
                  usedAt: tokenInput.usedAt,
                },
              });
            },
            createActivity: businessId
              ? async () => {
                  await transaction.businessActivity.create({
                    data: buildSelfPasswordChangeActivity({
                      actor: input.actor,
                      businessId,
                      activityContext: input.activityContext,
                    }),
                  });
                }
              : undefined,
          });
      });
    },
  });
}
