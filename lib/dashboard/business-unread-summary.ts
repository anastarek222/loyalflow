import prisma from "@/lib/prisma";

type BusinessUnreadSummaryRow = {
  unreadNotificationCount: bigint;
  unreadRewardReadyCount: bigint;
  unreadRewardRedeemedCount: bigint;
  unreadBalanceAdjustedCount: bigint;
  unreadLoyaltyEarnedCount: bigint;
};

export async function getBusinessUnreadSummary(input: {
  businessId: string;
  userId: string;
  rewardTargetCost: number;
  after: Date;
}) {
  const [row] = await prisma.$queryRaw<BusinessUnreadSummaryRow[]>`
    SELECT
      (
        SELECT COUNT(*)::bigint
        FROM "Notification" notification
        WHERE notification."businessId" = ${input.businessId}
          AND notification."createdAt" > ${input.after}
          AND (notification."userId" IS NULL OR notification."userId" = ${input.userId})
          AND NOT EXISTS (
            SELECT 1
            FROM "NotificationItemRead" item_read
            WHERE item_read."userId" = ${input.userId}
              AND item_read."businessId" = ${input.businessId}
              AND item_read."readAt" > ${input.after}
              AND item_read."notificationKey" = CONCAT('notification:', notification.id)
          )
      ) AS "unreadNotificationCount",
      (
        SELECT COUNT(*)::bigint
        FROM "Customer" customer
        WHERE customer."businessId" = ${input.businessId}
          AND customer."isActive" = true
          AND customer.balance >= ${input.rewardTargetCost}
          AND customer."updatedAt" > ${input.after}
          AND NOT EXISTS (
            SELECT 1
            FROM "NotificationItemRead" item_read
            WHERE item_read."userId" = ${input.userId}
              AND item_read."businessId" = ${input.businessId}
              AND item_read."readAt" > ${input.after}
              AND item_read."notificationKey" = CONCAT(
                'reward-ready:',
                customer.id,
                ':',
                customer.balance,
                ':',
                customer."lifetimeRedeemed"
              )
          )
      ) AS "unreadRewardReadyCount",
      (
        SELECT COUNT(*)::bigint
        FROM "BusinessActivity" activity
        WHERE activity."businessId" = ${input.businessId}
          AND activity."createdAt" > ${input.after}
          AND activity.type::text = 'REWARD_REDEEMED'
          AND NOT EXISTS (
            SELECT 1
            FROM "NotificationItemRead" item_read
            WHERE item_read."userId" = ${input.userId}
              AND item_read."businessId" = ${input.businessId}
              AND item_read."readAt" > ${input.after}
              AND item_read."notificationKey" = CONCAT('activity:', activity.id)
          )
      ) AS "unreadRewardRedeemedCount",
      (
        SELECT COUNT(*)::bigint
        FROM "BusinessActivity" activity
        WHERE activity."businessId" = ${input.businessId}
          AND activity."createdAt" > ${input.after}
          AND activity.type::text = 'BALANCE_ADJUSTED'
          AND NOT EXISTS (
            SELECT 1
            FROM "NotificationItemRead" item_read
            WHERE item_read."userId" = ${input.userId}
              AND item_read."businessId" = ${input.businessId}
              AND item_read."readAt" > ${input.after}
              AND item_read."notificationKey" = CONCAT('activity:', activity.id)
          )
      ) AS "unreadBalanceAdjustedCount",
      (
        SELECT COUNT(*)::bigint
        FROM "BusinessActivity" activity
        WHERE activity."businessId" = ${input.businessId}
          AND activity."createdAt" > ${input.after}
          AND activity.type::text = 'LOYALTY_EARNED'
          AND NOT EXISTS (
            SELECT 1
            FROM "NotificationItemRead" item_read
            WHERE item_read."userId" = ${input.userId}
              AND item_read."businessId" = ${input.businessId}
              AND item_read."readAt" > ${input.after}
              AND item_read."notificationKey" = CONCAT('activity:', activity.id)
          )
      ) AS "unreadLoyaltyEarnedCount"
  `;

  const unreadNotificationCount = Number(row?.unreadNotificationCount ?? 0);
  const unreadRewardReadyCount = Number(row?.unreadRewardReadyCount ?? 0);
  const unreadRewardRedeemedCount = Number(
    row?.unreadRewardRedeemedCount ?? 0,
  );
  const unreadBalanceAdjustedCount = Number(
    row?.unreadBalanceAdjustedCount ?? 0,
  );
  const unreadLoyaltyEarnedCount = Number(row?.unreadLoyaltyEarnedCount ?? 0);

  return {
    unreadNotificationCount,
    unreadRewardReadyCount,
    unreadRewardRedeemedCount,
    unreadBalanceAdjustedCount,
    unreadLoyaltyEarnedCount,
    unreadActivityCount:
      unreadRewardRedeemedCount +
      unreadBalanceAdjustedCount +
      unreadLoyaltyEarnedCount,
  };
}
