import type { RewardType } from "@/generated/prisma/client";
import { isRewardUnlockActionable } from "@/lib/rewards/expiration";

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

export type RewardAvailabilityUnlock = {
  rewardId: string;
  expiresAt: Date;
  redeemedAt: Date | null;
  expiredAt: Date | null;
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

/**
 * Catalogue redemption uses balance directly for non-expiring rewards. Only a
 * reward with an expiry policy requires a live persisted unlock lifecycle.
 */
export function getRedeemableCatalogueRewards(input: {
  customerActive: boolean;
  balance: number;
  catalogueRewards: readonly RewardAvailabilityOption[];
  rewardUnlocks: readonly RewardAvailabilityUnlock[];
  now?: Date;
}) {
  if (!input.customerActive) return [];

  const balance = Math.max(0, Math.trunc(input.balance));
  const actionableUnlockRewardIds = new Set(
    input.rewardUnlocks
      .filter((unlock) =>
        isRewardUnlockActionable({
          rewardActive: true,
          expiresAt: unlock.expiresAt,
          redeemedAt: unlock.redeemedAt,
          expiredAt: unlock.expiredAt,
          now: input.now,
        }),
      )
      .map((unlock) => unlock.rewardId),
  );

  return input.catalogueRewards
    .filter((reward) => reward.isActive !== false)
    .slice()
    .sort((left, right) => left.cost - right.cost || left.id.localeCompare(right.id))
    .filter((reward) => {
      if (balance < Math.max(1, Math.trunc(reward.cost))) return false;
      const expires =
        reward.expiresAfterDays !== null &&
        reward.expiresAfterDays !== undefined &&
        Number.isInteger(reward.expiresAfterDays) &&
        reward.expiresAfterDays > 0;
      return !expires || actionableUnlockRewardIds.has(reward.id);
    });
}
