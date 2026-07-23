import type { TransactionType } from "@/generated/prisma/client";
import { getRedemptionMagnitude } from "@/lib/analytics/metrics";

type LoyaltyTransactionPoint = {
  type: TransactionType;
  amount: number;
  createdAt: Date;
};

type CustomerCreatedPoint = {
  createdAt: Date;
};

type RewardRedemptionPoint = {
  rewardName: string;
};

function getShortDateKey(date: Date) {
  return date.toISOString().slice(5, 10);
}

export function createDashboardLoyaltyGrowth(
  transactions: readonly LoyaltyTransactionPoint[]
) {
  const buckets = new Map<
    string,
    {
      date: string;
      earned: number;
      redeemed: number;
    }
  >();

  for (const transaction of transactions) {
    const date = getShortDateKey(transaction.createdAt);

    const bucket = buckets.get(date) ?? {
      date,
      earned: 0,
      redeemed: 0,
    };

    if (transaction.type === "EARN") {
      bucket.earned += transaction.amount;
    } else if (transaction.type === "REDEEM") {
      bucket.redeemed += getRedemptionMagnitude(transaction.amount);
    }

    buckets.set(date, bucket);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export function createDashboardCustomerGrowth(
  customers: readonly CustomerCreatedPoint[]
) {
  const buckets = new Map<string, number>();

  for (const customer of customers) {
    const date = getShortDateKey(customer.createdAt);

    buckets.set(
      date,
      (buckets.get(date) ?? 0) + 1
    );
  }

  return Array.from(
    buckets,
    ([date, customers]) => ({
      date,
      customers,
    })
  ).sort((a, b) => a.date.localeCompare(b.date));
}

export function createDashboardRewardStats(
  redemptions: readonly RewardRedemptionPoint[]
) {
  const buckets = new Map<string, number>();

  for (const redemption of redemptions) {
    buckets.set(
      redemption.rewardName,
      (buckets.get(redemption.rewardName) ?? 0) + 1
    );
  }

  return Array.from(
    buckets,
    ([name, redeemed]) => ({
      name,
      redeemed,
    })
  ).sort((a, b) => b.redeemed - a.redeemed);
}
