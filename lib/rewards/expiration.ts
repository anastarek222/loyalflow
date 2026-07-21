export type RewardExpirationState =
  | "NOT_UNLOCKED"
  | "ACTIVE"
  | "EXPIRED";

type RewardExpirationInput = {
  unlockedAt: Date | null;
  expiresAfterDays: number | null;
  now?: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// This is a read-only policy foundation. It does not change a customer's
// balance or reward eligibility until an explicit persisted expiry model and
// customer-facing confirmation flow are approved.
export function getRewardExpiration(
  input: RewardExpirationInput
) {
  if (!input.unlockedAt) {
    return {
      state: "NOT_UNLOCKED" as const,
      expiresAt: null,
    };
  }

  if (
    input.expiresAfterDays === null ||
    !Number.isInteger(input.expiresAfterDays) ||
    input.expiresAfterDays < 1
  ) {
    return {
      state: "ACTIVE" as const,
      expiresAt: null,
    };
  }

  const expiresAt = new Date(
    input.unlockedAt.getTime() + input.expiresAfterDays * DAY_MS
  );

  return {
    state:
      (input.now ?? new Date()) >= expiresAt
        ? ("EXPIRED" as const)
        : ("ACTIVE" as const),
    expiresAt,
  };
}

export function getRewardExpiryDate(
  unlockedAt: Date,
  expiresAfterDays: number
) {
  return new Date(unlockedAt.getTime() + expiresAfterDays * DAY_MS);
}

export function getPersistedRewardUnlockState({
  expiresAt,
  redeemedAt,
  expiredAt,
  now = new Date(),
}: {
  expiresAt: Date;
  redeemedAt: Date | null;
  expiredAt: Date | null;
  now?: Date;
}) {
  if (redeemedAt) return "REDEEMED" as const;
  if (expiredAt || now >= expiresAt) return "EXPIRED" as const;
  return "ACTIVE" as const;
}

export function getRewardUnlockRedemptionState({
  expectedBusinessId,
  unlockBusinessId,
  rewardBusinessId,
  expiresAt,
  redeemedAt,
  expiredAt,
  now,
}: {
  expectedBusinessId: string;
  unlockBusinessId: string;
  rewardBusinessId: string;
  expiresAt: Date;
  redeemedAt: Date | null;
  expiredAt: Date | null;
  now?: Date;
}) {
  if (
    unlockBusinessId !== expectedBusinessId ||
    rewardBusinessId !== expectedBusinessId
  ) {
    return "WRONG_TENANT" as const;
  }

  return getPersistedRewardUnlockState({
    expiresAt,
    redeemedAt,
    expiredAt,
    now,
  }) === "ACTIVE"
    ? ("ACTIVE" as const)
    : ("EXPIRED" as const);
}
