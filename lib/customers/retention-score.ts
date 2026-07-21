import type { LoyaltyMode } from "@/generated/prisma/client";

type RetentionScoreInput = {
  now?: Date;
  createdAt: Date;
  lastActivityAt: Date | null;
  transactionCount: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  balance: number;
  loyaltyMode: LoyaltyMode;
  earnAmount: number;
  rewardThreshold: number;
};

export type RetentionScore = {
  score: number;
  label: "Very Loyal" | "Active" | "At Risk" | "High Risk / Inactive";
};

function clamp(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum, value));
}

function daysSince(date: Date, now: Date) {
  return Math.max(0, (now.getTime() - date.getTime()) / 86_400_000);
}

function getRecencyPoints(days: number) {
  if (days <= 7) return 35;
  if (days <= 30) return 25;
  if (days <= 60) return 12;
  return 0;
}

function getLabel(score: number): RetentionScore["label"] {
  if (score >= 80) return "Very Loyal";
  if (score >= 60) return "Active";
  if (score >= 30) return "At Risk";
  return "High Risk / Inactive";
}

// The score is intentionally explainable: recency (35), transaction frequency
// (20), value/loyalty engagement (20), progress (15), and redemption history
// (10). For non-sales programmes, value points become loyalty-engagement
// points because no reliable monetary amount exists.
export function calculateRetentionScore(
  input: RetentionScoreInput
): RetentionScore {
  const now = input.now ?? new Date();
  const referenceActivity = input.lastActivityAt ?? input.createdAt;
  const recency = getRecencyPoints(daysSince(referenceActivity, now));
  const frequency = clamp(input.transactionCount, 10) * 2;
  const safeRewardThreshold = Math.max(1, input.rewardThreshold);
  const safeEarnAmount = Math.max(1, input.earnAmount);
  const valueTarget =
    input.loyaltyMode === "SALES_AMOUNT"
      ? safeRewardThreshold * 10
      : safeEarnAmount * 10;
  const valueOrEngagement =
    (clamp(input.lifetimeEarned / valueTarget, 1) * 20);
  const progress =
    clamp(input.balance / safeRewardThreshold, 1) * 15;
  const redemptionTarget = safeRewardThreshold * 3;
  const redemption =
    clamp(input.lifetimeRedeemed / redemptionTarget, 1) * 10;
  const score = Math.round(
    recency + frequency + valueOrEngagement + progress + redemption
  );

  return {
    score,
    label: getLabel(score),
  };
}
