export type PendingOwnerCandidate = {
  role: string;
  onboardingStatus: string;
  businessId: string | null;
};

export function canUsePendingOwnerOnboarding(
  user: PendingOwnerCandidate,
): boolean {
  return (
    user.role === "OWNER" &&
    user.onboardingStatus === "PENDING" &&
    user.businessId === null
  );
}

export function isPendingOwnerCompletionClaimed(
  updatedCount: number,
): boolean {
  return updatedCount === 1;
}

type PendingOwnerCompletionUpdater<TClearOnboardingData> = {
  updateMany(input: {
    where: {
      id: string;
      role: "OWNER";
      onboardingStatus: "PENDING";
      businessId: null;
    };
    data: {
      businessId: string;
      onboardingStatus: "COMPLETE";
      onboardingData: TClearOnboardingData;
    };
  }): Promise<{ count: number }>;
};

export async function claimPendingOwnerCompletion<TClearOnboardingData>(
  input: {
    userId: string;
    businessId: string;
    clearOnboardingData: TClearOnboardingData;
  },
  updater: PendingOwnerCompletionUpdater<TClearOnboardingData>,
): Promise<boolean> {
  const result = await updater.updateMany({
    where: {
      id: input.userId,
      role: "OWNER",
      onboardingStatus: "PENDING",
      businessId: null,
    },
    data: {
      businessId: input.businessId,
      onboardingStatus: "COMPLETE",
      onboardingData: input.clearOnboardingData,
    },
  });

  return isPendingOwnerCompletionClaimed(result.count);
}

type PendingOwnerDraftUpdater<TOnboardingData> = {
  updateMany(input: {
    where: {
      id: string;
      role: "OWNER";
      onboardingStatus: "PENDING";
      businessId: null;
    };
    data: {
      onboardingData: TOnboardingData;
    };
  }): Promise<{ count: number }>;
};

export async function savePendingOwnerDraft<TOnboardingData>(
  input: {
    userId: string;
    onboardingData: TOnboardingData;
  },
  updater: PendingOwnerDraftUpdater<TOnboardingData>,
): Promise<boolean> {
  const result = await updater.updateMany({
    where: {
      id: input.userId,
      role: "OWNER",
      onboardingStatus: "PENDING",
      businessId: null,
    },
    data: {
      onboardingData: input.onboardingData,
    },
  });

  return result.count === 1;
}
