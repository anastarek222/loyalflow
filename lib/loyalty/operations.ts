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
      : earnAmount;

  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < 1
  ) {
    throw new Error("A positive whole-number loyalty amount is required.");
  }

  const isSale = loyaltyMode === "SALES_AMOUNT";

  return {
    amount,
    transactionNote: isSale
      ? `Sale recorded: ${amount} ${unitName}`
      : "Loyalty credit added",
    activityDescription: isSale
      ? `Recorded sale amount ${amount} ${unitName}`
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
