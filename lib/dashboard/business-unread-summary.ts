import { parseNotificationReadKey } from "@/lib/notification-read-state";
import prisma from "@/lib/prisma";

export async function getBusinessUnreadSummary(input: {
  businessId: string;
  rewardTargetCost: number;
  after: Date;
  individuallyReadKeys: Iterable<string>;
}) {
  const activityReadIds: string[] = [];
  const rewardReadyReadStates: Array<{
    customerId: string;
    balance: number;
    lifetimeRedeemed: number;
  }> = [];

  for (const key of input.individuallyReadKeys) {
    const parsed = parseNotificationReadKey(key);
    if (parsed?.kind === "activity") {
      activityReadIds.push(parsed.activityId);
    } else if (parsed?.kind === "reward-ready") {
      rewardReadyReadStates.push(parsed);
    }
  }

  const activityWhere = {
    businessId: input.businessId,
    createdAt: { gt: input.after },
    ...(activityReadIds.length ? { id: { notIn: activityReadIds } } : {}),
  };

  const [
    unreadRewardReadyCount,
    unreadRewardRedeemedCount,
    unreadBalanceAdjustedCount,
    unreadLoyaltyEarnedCount,
  ] = await Promise.all([
    prisma.customer.count({
      where: {
        businessId: input.businessId,
        isActive: true,
        balance: { gte: input.rewardTargetCost },
        updatedAt: { gt: input.after },
        ...(rewardReadyReadStates.length
          ? {
              NOT: rewardReadyReadStates.map((target) => ({
                id: target.customerId,
                balance: target.balance,
                lifetimeRedeemed: target.lifetimeRedeemed,
              })),
            }
          : {}),
      },
    }),
    prisma.businessActivity.count({
      where: { ...activityWhere, type: "REWARD_REDEEMED" },
    }),
    prisma.businessActivity.count({
      where: { ...activityWhere, type: "BALANCE_ADJUSTED" },
    }),
    prisma.businessActivity.count({
      where: { ...activityWhere, type: "LOYALTY_EARNED" },
    }),
  ]);

  return {
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
