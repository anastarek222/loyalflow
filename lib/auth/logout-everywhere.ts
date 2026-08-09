import {
  logoutEverywhereWithStore,
  type LogoutEverywhereInput,
  type LogoutEverywhereResult,
} from "@/lib/auth/logout-everywhere-core";
import { recordSecurityNotification } from "@/lib/auth/security-notification";
import prisma from "@/lib/prisma";

export async function revokeAuthenticatedUserSessions(
  input: LogoutEverywhereInput,
): Promise<LogoutEverywhereResult> {
  return logoutEverywhereWithStore(input, {
    async incrementAuthVersionIfCurrent(conditionalInput) {
      return prisma.$transaction(async (transaction) => {
        const updated = await transaction.user.updateMany({
          where: {
            id: conditionalInput.userId,
            authVersion: conditionalInput.expectedAuthVersion,
            isActive: true,
          },
          data: {
            authVersion: {
              increment: 1,
            },
          },
        });

        if (updated.count === 1) {
          await recordSecurityNotification(transaction, {
            userId: conditionalInput.userId,
            event: "SESSIONS_REVOKED",
          });
        }

        return updated.count;
      });
    },
  });
}
