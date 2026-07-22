export type BusinessOnboardingInput = {
  userCount: number;
  unitName: string | null | undefined;
  rewardName: string | null | undefined;
  rewardThreshold: number;
  earnAmount: number;
  logoUrl: string | null;
  coverImageUrl: string | null;
};

export type BusinessOnboardingState = {
  profileComplete: boolean;
  teamComplete: boolean;
  loyaltyComplete: boolean;
  brandingComplete: boolean;
  coreReady: boolean;
  progress: number;
};

export function getBusinessOnboardingState(
  business: BusinessOnboardingInput
): BusinessOnboardingState {
  // Optional profile metadata must never block operational readiness.
  const profileComplete = true;

  // The owner created with the business is sufficient.
  const teamComplete = business.userCount >= 1;

  const loyaltyComplete = Boolean(
    business.unitName?.trim() &&
      business.rewardName?.trim() &&
      business.rewardThreshold > 0 &&
      business.earnAmount > 0
  );

  // Branding remains a setup milestone, but it is not operationally required.
  const brandingComplete = Boolean(
    business.logoUrl || business.coverImageUrl
  );

  const coreReady =
    profileComplete &&
    teamComplete &&
    loyaltyComplete;

  const completedSteps = [
    profileComplete,
    teamComplete,
    loyaltyComplete,
    brandingComplete,
  ].filter(Boolean).length;

  return {
    profileComplete,
    teamComplete,
    loyaltyComplete,
    brandingComplete,
    coreReady,
    progress: Math.round(
      (completedSteps / 4) * 100
    ),
  };
}
