export type RewardProgress = {
  progress: number;
  remaining: number;
  rewardAvailable: boolean;
};

export function calculateRewardProgress(
  balance: number,
  rewardThreshold: number,
  isActive = true
): RewardProgress {
  const safeBalance = Math.max(0, Math.trunc(balance));
  const safeThreshold = Math.max(1, Math.trunc(rewardThreshold));

  return {
    progress: Math.min(
      100,
      Math.floor((safeBalance / safeThreshold) * 100)
    ),
    remaining: Math.max(0, safeThreshold - safeBalance),
    rewardAvailable: isActive && safeBalance >= safeThreshold,
  };
}
