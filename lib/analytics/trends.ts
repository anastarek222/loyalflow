export type DailyTrendPoint = {
  date: string;
  value: number;
};

type TrendEvent = {
  createdAt: Date;
  value?: number;
};

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getStartOfDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

export function createDailyTrend(
  events: readonly TrendEvent[],
  from: Date,
  to: Date
): DailyTrendPoint[] {
  const start = getStartOfDay(from);
  const end = getStartOfDay(to);

  if (start > end) {
    return [];
  }

  const buckets = new Map<string, number>();

  for (
    const date = new Date(start);
    date <= end;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    buckets.set(getDateKey(date), 0);
  }

  for (const event of events) {
    const key = getDateKey(event.createdAt);

    if (!buckets.has(key)) {
      continue;
    }

    buckets.set(
      key,
      (buckets.get(key) ?? 0) + (event.value ?? 1)
    );
  }

  return Array.from(
    buckets,
    ([date, value]) => ({ date, value })
  );
}

type HistoricalCustomerEvent = {
  createdAt: Date;
};

type HistoricalLoyaltyEvent = {
  createdAt: Date;
  amount: number;
};

type HistoricalRewardEvent = {
  createdAt: Date;
};

export function createHistoricalAnalyticsTrends(
  input: {
    customers: readonly HistoricalCustomerEvent[];
    loyaltyEarned: readonly HistoricalLoyaltyEvent[];
    rewardsRedeemed: readonly HistoricalRewardEvent[];
  },
  from: Date,
  to: Date
) {
  return {
    customers: createDailyTrend(
      input.customers,
      from,
      to
    ),

    loyaltyEarned: createDailyTrend(
      input.loyaltyEarned.map((event) => ({
        createdAt: event.createdAt,
        value: event.amount,
      })),
      from,
      to
    ),

    rewardsRedeemed: createDailyTrend(
      input.rewardsRedeemed,
      from,
      to
    ),
  };
}

