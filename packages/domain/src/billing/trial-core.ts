const DAY_MS = 24 * 60 * 60 * 1000;

export const TRIAL_DURATION_DAYS = 14;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * DAY_MS;
export const TRIAL_FINAL_DAY_REMINDER_MS = 1 * DAY_MS;

export function createTrialWindow(now = new Date()) {
  const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_MS);

  return {
    trialStartedAt: now,
    trialEndsAt,
    // Compatibility aliases for existing business/admin creation consumers.
    // New code should prefer the explicit trial* field names above.
    startedAt: now,
    expiresAt: trialEndsAt,
  };
}

export function getTrialDaysRemaining(args: {
  now?: Date;
  trialEndsAt?: Date | null;
}) {
  const now = args.now ?? new Date();
  const trialEndsAt = args.trialEndsAt;
  if (!trialEndsAt) return null;

  const diff = trialEndsAt.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_MS);
}

export function getTrialState(args: {
  now?: Date;
  trialEndsAt?: Date | null;
}) {
  const now = args.now ?? new Date();
  const trialEndsAt = args.trialEndsAt;

  if (!trialEndsAt) {
    return {
      isTrialActive: false,
      isTrialExpired: false,
      isFinalDay: false,
      daysRemaining: null,
    };
  }

  const diff = trialEndsAt.getTime() - now.getTime();
  const isTrialActive = diff > 0;
  const isTrialExpired = diff <= 0;
  const isFinalDay = isTrialActive && diff <= TRIAL_FINAL_DAY_REMINDER_MS;

  return {
    isTrialActive,
    isTrialExpired,
    isFinalDay,
    daysRemaining: getTrialDaysRemaining({ now, trialEndsAt }),
  };
}
