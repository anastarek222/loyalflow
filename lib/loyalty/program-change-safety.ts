export type LoyaltyProgramHistoryState = {
  customerWithBalance: boolean;
  transactionCount: number;
  rewardCount: number;
  unlockCount: number;
  redemptionCount: number;
};

export function hasLoyaltyProgramHistory(
  state: LoyaltyProgramHistoryState,
) {
  return (
    state.customerWithBalance ||
    state.transactionCount > 0 ||
    state.rewardCount > 0 ||
    state.unlockCount > 0 ||
    state.redemptionCount > 0
  );
}

export function isLoyaltyModeChangeBlocked(input: {
  currentMode: string;
  proposedMode: string;
  history: LoyaltyProgramHistoryState;
}) {
  return (
    input.currentMode !== input.proposedMode &&
    hasLoyaltyProgramHistory(input.history)
  );
}

export const loyaltyEconomicRuleFields = [
  "earnAmount",
  "rewardThreshold",
  "rewardType",
] as const;

export type LoyaltyEconomicRules = {
  earnAmount: number;
  rewardThreshold: number;
  rewardType: string;
};

export function getLoyaltyEconomicRuleChanges(
  current: LoyaltyEconomicRules,
  proposed: LoyaltyEconomicRules,
) {
  return loyaltyEconomicRuleFields
    .filter((field) => current[field] !== proposed[field])
    .map((field) => ({
      field,
      before: current[field],
      after: proposed[field],
    }));
}

export function isLoyaltyEconomicRuleConfirmationRequired(input: {
  current: LoyaltyEconomicRules;
  proposed: LoyaltyEconomicRules;
  history: LoyaltyProgramHistoryState;
}) {
  return (
    getLoyaltyEconomicRuleChanges(input.current, input.proposed).length > 0 &&
    hasLoyaltyProgramHistory(input.history)
  );
}
