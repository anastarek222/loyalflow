import type { LoyaltyMode } from "@/generated/prisma/client";
import type { CustomerSegmentContext } from "@/lib/customers/segments";
import {
  summarizeLedgerOperations,
  type LedgerReportingTransaction,
} from "@/lib/loyalty/ledger-reporting";
import {
  getRewardAvailability,
  type RewardAvailabilityOption,
} from "@/lib/rewards/availability";

/**
 * V1 value contract: a SALES_AMOUNT customer becomes HIGH_SPENDER after net
 * qualifying sales equal ten current reward cycles. The sales metric itself is
 * ledger truth (recorded sales minus earn refunds/voids), never loyalty points.
 */
export const HIGH_SPENDER_NET_SALES_REWARD_CYCLES = 10;

/**
 * V1 engagement contract: ten qualifying earn/visit operations in the current
 * 30-day activity window. One EARN operation counts once regardless of points
 * or promotion bonus amount, so balance/lifetimeEarned cannot inflate visits.
 */
export const FREQUENT_VISITOR_EARN_EVENTS = 10;
export const FREQUENT_VISITOR_LOOKBACK_DAYS = 30;

export type AudienceMetricTransaction = LedgerReportingTransaction & {
  createdAt: Date;
  sourceLoyaltyMode?: LoyaltyMode | null;
};

export function getHighSpenderNetSalesThreshold(rewardThreshold: number) {
  return Math.max(1, Math.trunc(rewardThreshold)) *
    HIGH_SPENDER_NET_SALES_REWARD_CYCLES;
}

export function getFrequentVisitorWindowStart(
  now = new Date(),
  lookbackDays = FREQUENT_VISITOR_LOOKBACK_DAYS,
) {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - Math.max(1, Math.trunc(lookbackDays)));
  return start;
}

function isQualifyingVisitEvent(
  transaction: AudienceMetricTransaction,
  loyaltyMode: LoyaltyMode,
  since: Date,
) {
  if (transaction.type !== "EARN" || transaction.createdAt < since) {
    return false;
  }

  // Legacy rows may predate sourceLoyaltyMode. Keep them eligible rather than
  // silently dropping real visits, while excluding rows from a different mode.
  return (
    transaction.sourceLoyaltyMode === null ||
    transaction.sourceLoyaltyMode === undefined ||
    transaction.sourceLoyaltyMode === loyaltyMode
  );
}

export function resolveCustomerAudienceContext(input: {
  loyaltyMode: LoyaltyMode;
  customerActive: boolean;
  balance: number;
  rewardThreshold: number;
  rewardName: string;
  catalogueRewards: readonly RewardAvailabilityOption[];
  transactions: readonly AudienceMetricTransaction[];
  now?: Date;
}): CustomerSegmentContext {
  const now = input.now ?? new Date();
  const rewardAvailability = getRewardAvailability({
    customerActive: input.customerActive,
    balance: input.balance,
    rewardThreshold: input.rewardThreshold,
    fallbackReward: {
      name: input.rewardName,
      cost: input.rewardThreshold,
    },
    catalogueRewards: input.catalogueRewards,
  });

  if (input.loyaltyMode === "SALES_AMOUNT") {
    const sales = summarizeLedgerOperations(input.transactions);

    return {
      rewardReady: rewardAvailability.rewardReady,
      netQualifyingSales: sales.netRecordedSales,
      highSpenderThreshold: getHighSpenderNetSalesThreshold(
        input.rewardThreshold,
      ),
    };
  }

  const visitWindowStart = getFrequentVisitorWindowStart(now);
  const qualifyingVisitCount = input.transactions.filter((transaction) =>
    isQualifyingVisitEvent(transaction, input.loyaltyMode, visitWindowStart),
  ).length;

  return {
    rewardReady: rewardAvailability.rewardReady,
    qualifyingVisitCount,
    frequentVisitorThreshold: FREQUENT_VISITOR_EARN_EVENTS,
  };
}
