export type LoyaltyProgramRulesSnapshot = {
  loyaltyProgramName: string | null;
  pointsName: string | null;
  welcomeMessage: string | null;
  cardDefaultLanguage: "AR" | "EN";
  loyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT";
  unitName: string;
  rewardName: string;
  rewardType: "GIFT" | "PROMO_CODE" | "DISCOUNT" | "CUSTOM";
  rewardCode: string | null;
  rewardDescription: string | null;
  rewardThreshold: number;
  earnAmount: number;
};

export const loyaltyProgramRuleKeys = [
  "loyaltyProgramName",
  "pointsName",
  "welcomeMessage",
  "cardDefaultLanguage",
  "loyaltyMode",
  "unitName",
  "rewardName",
  "rewardType",
  "rewardCode",
  "rewardDescription",
  "rewardThreshold",
  "earnAmount",
] as const;

export function getLoyaltyProgramRulesAuditMetadata(
  before: LoyaltyProgramRulesSnapshot,
  after: LoyaltyProgramRulesSnapshot,
) {
  const changedFields = loyaltyProgramRuleKeys.filter(
    (field) => before[field] !== after[field],
  );

  return {
    domain: "LOYALTY_PROGRAM_RULES",
    changedFields: [...changedFields],
    before: { ...before },
    after: { ...after },
  };
}
