import { RewardType } from "@/generated/prisma/client";
import { z } from "zod";

export const rewardInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).optional(),
  type: z.nativeEnum(RewardType),
  code: z.string().trim().max(100).optional(),
  cost: z.coerce.number().int().min(1).max(1_000_000),
  expiresAfterDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(3_650)
    .optional(),
});

export type RewardInput = z.infer<typeof rewardInputSchema>;

export type RewardOption = {
  id: string | null;
  name: string;
  description: string | null;
  type: RewardType;
  code: string | null;
  cost: number;
  expiresAfterDays?: number | null;
};

type CatalogReward = Omit<RewardOption, "id"> & {
  id: string;
};

type LegacyReward = Omit<RewardOption, "id">;

export function normalizeRewardInput(input: RewardInput) {
  return {
    ...input,
    description: input.description || null,
    code: input.code || null,
    expiresAfterDays: input.expiresAfterDays ?? null,
  };
}

// Existing businesses keep their configured reward until they add a catalogue
// item. This prevents a new empty catalogue from changing redemption behavior.
export function getAvailableRewardOptions(
  rewards: readonly CatalogReward[],
  legacyReward: LegacyReward
): RewardOption[] {
  return rewards.length > 0
    ? [...rewards]
    : [{ id: null, ...legacyReward }];
}
