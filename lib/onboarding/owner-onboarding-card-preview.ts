import type { LoyaltyCardMode } from "@/lib/cards/standard-card";
import { OWNER_ONBOARDING_DEFAULTS } from "@/lib/onboarding/owner-onboarding-defaults";

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

function loyaltyMode(
  value: unknown,
  fallback: LoyaltyCardMode = OWNER_ONBOARDING_DEFAULTS.loyaltyMode,
): LoyaltyCardMode {
  const candidate = String(
    value || OWNER_ONBOARDING_DEFAULTS.loyaltyMode,
  ) as LoyaltyCardMode;
  return SUPPORTED_MODES.has(candidate) ? candidate : fallback;
}

export function createOwnerOnboardingCardPreviewState(
  draft: Record<string, unknown>,
): OwnerOnboardingCardPreviewState {
  return {
    businessName: String(draft.name || "Your Business"),
    loyaltyMode: loyaltyMode(draft.loyaltyMode),
    unitName: String(draft.unitName || OWNER_ONBOARDING_DEFAULTS.unitName),
    rewardName: String(draft.rewardName || OWNER_ONBOARDING_DEFAULTS.rewardName),
    rewardThreshold: positiveNumber(
      draft.rewardThreshold,
      OWNER_ONBOARDING_DEFAULTS.rewardThreshold,
    ),
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
      return {
        ...current,
        loyaltyMode: loyaltyMode(value, current.loyaltyMode),
      };
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
