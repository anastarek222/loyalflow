import type {
  LoyaltyMode,
  RewardType,
} from "@/generated/prisma/client";

type EarnDetailsInput = {
  loyaltyMode: LoyaltyMode;
  earnAmount: number;
  saleAmount?: number;
  unitName: string;
};

export function getEarnDetails({
  loyaltyMode,
  earnAmount,
  saleAmount,
  unitName,
}: EarnDetailsInput) {
  const amount =
    loyaltyMode === "SALES_AMOUNT"
      ? saleAmount
      : loyaltyMode === "VISITS"
        ? 1
        : earnAmount;

  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < 1
  ) {
    throw new Error("A positive whole-number loyalty amount is required.");
  }

  const isSale = loyaltyMode === "SALES_AMOUNT";
  const isVisit = loyaltyMode === "VISITS";

  return {
    amount,
    transactionNote: isSale
      ? `Sale recorded: ${amount} ${unitName}`
      : isVisit
        ? "Visit recorded"
        : "Loyalty credit added",
    activityDescription: isSale
      ? `Recorded sale amount ${amount} ${unitName}`
      : isVisit
        ? "Recorded 1 visit"
        : `Added ${amount} loyalty credit`,
  };
}

export function getRewardLabel(
  rewardType: RewardType,
  rewardName: string,
  rewardCode: string | null
) {
  return rewardType === "PROMO_CODE" && rewardCode
    ? `${rewardName} — ${rewardCode}`
    : rewardName;
}
