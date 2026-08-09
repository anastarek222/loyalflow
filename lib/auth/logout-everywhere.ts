import {
  logoutEverywhereWithStore,
  type LogoutEverywhereInput,
  type LogoutEverywhereResult,
} from "@/lib/auth/logout-everywhere-core";
import prisma from "@/lib/prisma";

export async function revokeAuthenticatedUserSessions(
  input: LogoutEverywhereInput,
): Promise<LogoutEverywhereResult> {
  return logoutEverywhereWithStore(input, {
    async incrementAuthVersionIfCurrent(conditionalInput) {
      const updated = await prisma.user.updateMany({
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

      return updated.count;
    },
  });
}
