import type { RewardType } from "@/generated/prisma/client";

export type RewardAvailabilityOption = {
  id: string;
  name: string;
  cost: number;
  isActive?: boolean;
  description?: string | null;
  type?: RewardType;
  code?: string | null;
  expiresAfterDays?: number | null;
};

export type FallbackRewardOption = Omit<RewardAvailabilityOption, "id" | "isActive"> & {
  id?: null;
};

export function getRewardAvailability(input: {
  customerActive: boolean;
  balance: number;
  rewardThreshold: number;
  fallbackReward: FallbackRewardOption;
  catalogueRewards: readonly RewardAvailabilityOption[];
}) {
  const activeCatalogueRewards = input.catalogueRewards
    .filter((reward) => reward.isActive !== false)
    .slice()
    .sort((left, right) => left.cost - right.cost || left.id.localeCompare(right.id));
  const source = activeCatalogueRewards.length ? "CATALOGUE" as const : "FALLBACK" as const;
  const fallbackReward = { ...input.fallbackReward, id: null, cost: Math.max(1, Math.trunc(input.rewardThreshold)) };
  const rewards = source === "CATALOGUE" ? activeCatalogueRewards : [fallbackReward];
  const defaultReward = rewards[0]!;
  const balance = Math.max(0, Math.trunc(input.balance));
  const targetCost = Math.max(1, Math.trunc(defaultReward.cost));
  const affordableRewards = activeCatalogueRewards.filter((reward) => balance >= Math.max(1, Math.trunc(reward.cost)));
  const rewardReady = input.customerActive && (source === "CATALOGUE" ? affordableRewards.length > 0 : balance >= targetCost);

  return {
    source,
    activeCatalogueRewards,
    defaultReward,
    affordableRewards,
    rewardReady,
    targetCost,
    remaining: Math.max(0, targetCost - balance),
    progress: Math.min(100, Math.floor((balance / targetCost) * 100)),
  };
}
