import type { LoyaltyMode } from "@/generated/prisma/client";

export type PromotionCandidate = {
  id: string;
  businessId: string;
  isActive: boolean;
  loyaltyMode: LoyaltyMode | null;
  minimumTransactionAmount: number | null;
  bonusAmount: number;
  bonusMultiplier: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
};

type PromotionSelectionInput = {
  businessId: string;
  loyaltyMode: LoyaltyMode;
  transactionAmount: number;
  occurredAt?: Date;
  promotions: readonly PromotionCandidate[];
};

export function calculatePromotionBonus(
  promotion: Pick<
    PromotionCandidate,
    "bonusAmount" | "bonusMultiplier"
  >,
  transactionAmount: number
) {
  if (!Number.isInteger(transactionAmount) || transactionAmount < 1) {
    return 0;
  }

  const multiplierBonus =
    promotion.bonusMultiplier && promotion.bonusMultiplier > 1
      ? transactionAmount * (promotion.bonusMultiplier - 1)
      : 0;

  return promotion.bonusAmount + multiplierBonus;
}

// Promotions are deliberately deterministic: only one eligible promotion can
// apply, choosing the largest bonus and then the earliest-created rule.
export function selectEligiblePromotion({
  businessId,
  loyaltyMode,
  transactionAmount,
  occurredAt = new Date(),
  promotions,
}: PromotionSelectionInput): PromotionCandidate | null {
  if (!Number.isInteger(transactionAmount) || transactionAmount < 1) {
    return null;
  }

  const eligible = promotions.filter((promotion) =>
    promotion.businessId === businessId &&
    promotion.isActive &&
    calculatePromotionBonus(promotion, transactionAmount) > 0 &&
    (promotion.loyaltyMode === null ||
      promotion.loyaltyMode === loyaltyMode) &&
    (promotion.minimumTransactionAmount === null ||
      transactionAmount >= promotion.minimumTransactionAmount) &&
    (promotion.startsAt === null || promotion.startsAt <= occurredAt) &&
    (promotion.endsAt === null || promotion.endsAt >= occurredAt)
  );

  return eligible.sort((left, right) =>
    calculatePromotionBonus(right, transactionAmount) -
      calculatePromotionBonus(left, transactionAmount) ||
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.id.localeCompare(right.id)
  )[0] ?? null;
}
