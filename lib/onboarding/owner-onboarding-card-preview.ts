import type { LoyaltyCardMode } from "@/lib/cards/standard-card";

export type OwnerOnboardingCardPreviewState = {
  businessName: string;
  loyaltyMode: LoyaltyCardMode;
  unitName: string;
  rewardName: string;
  rewardThreshold: number;
};

const SUPPORTED_MODES = new Set<LoyaltyCardMode>([
  "VISITS",
  "POINTS",
  "SALES_AMOUNT",
]);

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loyaltyMode(value: unknown): LoyaltyCardMode {
  const candidate = String(value || "POINTS") as LoyaltyCardMode;
  return SUPPORTED_MODES.has(candidate) ? candidate : "POINTS";
}

export function createOwnerOnboardingCardPreviewState(
  draft: Record<string, unknown>,
): OwnerOnboardingCardPreviewState {
  return {
    businessName: String(draft.name || "Your Business"),
    loyaltyMode: loyaltyMode(draft.loyaltyMode),
    unitName: String(draft.unitName || "Points"),
    rewardName: String(draft.rewardName || "Free Reward"),
    rewardThreshold: positiveNumber(draft.rewardThreshold, 1000),
  };
}

export function updateOwnerOnboardingCardPreviewState(
  current: OwnerOnboardingCardPreviewState,
  field: string,
  value: unknown,
): OwnerOnboardingCardPreviewState {
  switch (field) {
    case "name":
      return { ...current, businessName: String(value) };
    case "loyaltyMode":
      return { ...current, loyaltyMode: loyaltyMode(value) };
    case "unitName":
      return { ...current, unitName: String(value) };
    case "rewardName":
      return { ...current, rewardName: String(value) };
    case "rewardThreshold":
      return {
        ...current,
        rewardThreshold: positiveNumber(value, current.rewardThreshold),
      };
    default:
      return current;
  }
}
