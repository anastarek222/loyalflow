import {
  assertTenantScopedNotificationReadTarget,
  notificationItemReadWhere,
  notificationReadStateWhere,
} from "@/lib/notification-read-state";
import prisma from "@/lib/prisma";

/**
 * Per-user notification read state is presentation state, not a subscription
 * expansion/operation. It intentionally remains writable for an authorized
 * tenant user even when the business subscription is restricted.
 */
export async function markBusinessNotificationsReadCommand(input: {
  businessId: string;
  userId: string;
}) {
  const readAt = new Date();

  await prisma.$transaction([
    prisma.notificationReadState.upsert({
      where: notificationReadStateWhere({
        userId: input.userId,
        businessId: input.businessId,
      }),
      update: { lastReadAt: readAt },
      create: {
        userId: input.userId,
        businessId: input.businessId,
        lastReadAt: readAt,
      },
    }),
    prisma.notificationItemRead.deleteMany({
      where: {
        userId: input.userId,
        businessId: input.businessId,
      },
    }),
  ]);
}

/**
 * Resolves the client-provided notification key against authoritative tenant
 * data and records the individual read marker in the same transaction.
 */
export async function markBusinessNotificationItemReadCommand(input: {
  businessId: string;
  userId: string;
  notificationKey: string;
}) {
  const readAt = new Date();

  await prisma.$transaction(async (transaction) => {
    const business = await transaction.business.findUnique({
      where: { id: input.businessId },
      select: { rewardThreshold: true },
    });
    if (!business) {
      throw new Error("Business not found");
    }

    await assertTenantScopedNotificationReadTarget({
      notificationKey: input.notificationKey,
      businessId: input.businessId,
      userId: input.userId,
      rewardThreshold: business.rewardThreshold,
      lookup: {
        findNotification: (id) =>
          transaction.notification.findUnique({
            where: { id },
            select: { businessId: true, userId: true },
          }),
        findActivity: (id) =>
          transaction.businessActivity.findUnique({
            where: { id },
            select: { businessId: true, type: true },
          }),
        findRewardReadyCustomer: ({ id, balance, lifetimeRedeemed }) =>
          transaction.customer.findFirst({
            where: {
              id,
              businessId: input.businessId,
              balance,
              lifetimeRedeemed,
            },
            select: { businessId: true, isActive: true },
          }),
      },
    });

    await transaction.notificationItemRead.upsert({
      where: notificationItemReadWhere({
        userId: input.userId,
        businessId: input.businessId,
        notificationKey: input.notificationKey,
      }),
      update: { readAt },
      create: {
        userId: input.userId,
        businessId: input.businessId,
        notificationKey: input.notificationKey,
        readAt,
      },
    });
  });
}
