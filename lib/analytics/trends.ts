import { formatDateInputInTimeZone } from "@/lib/analytics/date-range";

export type DailyTrendPoint = {
  date: string;
  value: number;
};

type TrendEvent = {
  createdAt: Date;
  value?: number;
};

function addCalendarDay(dateInput: string) {
  const [year, month, day] = dateInput.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function createDailyTrend(
  events: readonly TrendEvent[],
  from: Date,
  to: Date,
  timeZone = "UTC",
): DailyTrendPoint[] {
  const startKey = formatDateInputInTimeZone(from, timeZone);
  const endKey = formatDateInputInTimeZone(to, timeZone);

  if (startKey > endKey) {
    return [];
  }

  const buckets = new Map<string, number>();

  for (let date = startKey; date <= endKey; date = addCalendarDay(date)) {
    buckets.set(date, 0);
  }

  for (const event of events) {
    const key = formatDateInputInTimeZone(event.createdAt, timeZone);

    if (!buckets.has(key)) {
      continue;
    }

    buckets.set(key, (buckets.get(key) ?? 0) + (event.value ?? 1));
  }

  return Array.from(buckets, ([date, value]) => ({ date, value }));
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
  to: Date,
  timeZone = "UTC",
) {
  return {
    customers: createDailyTrend(input.customers, from, to, timeZone),

    loyaltyEarned: createDailyTrend(
      input.loyaltyEarned.map((event) => ({
        createdAt: event.createdAt,
        value: event.amount,
      })),
      from,
      to,
      timeZone,
    ),

    rewardsRedeemed: createDailyTrend(
      input.rewardsRedeemed,
      from,
      to,
      timeZone,
    ),
  };
}
