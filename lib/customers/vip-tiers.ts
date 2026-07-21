export const vipTiers = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
] as const;

export type VipTier = (typeof vipTiers)[number];

type VipTierInput = {
  lifetimeEarned: number;
  rewardThreshold: number;
};

// Tiers are a read-only qualification foundation. They do not change earning,
// rewards, permissions, or customer balances until a later approved benefit
// design is persisted and database-verified.
export function getVipTier({
  lifetimeEarned,
  rewardThreshold,
}: VipTierInput): VipTier {
  const cycle = Math.max(1, rewardThreshold);
  const earned = Math.max(0, lifetimeEarned);

  if (earned >= cycle * 20) return "PLATINUM";
  if (earned >= cycle * 10) return "GOLD";
  if (earned >= cycle * 5) return "SILVER";
  return "BRONZE";
}
