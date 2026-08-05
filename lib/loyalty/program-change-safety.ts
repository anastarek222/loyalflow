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
