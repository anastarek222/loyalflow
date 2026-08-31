const DAY_MS = 24 * 60 * 60 * 1000;

export const TRIAL_DURATION_MS = 7 * DAY_MS;
export const TRIAL_REMINDER_LEAD_MS = DAY_MS;

export type TrialEligibilityIdentity = {
  ownerId: string;
  businessId: string;
  invitationId: string;
};

export type TrialWindow = {
  startedAt: Date;
  reminderAt: Date;
  expiresAt: Date;
};

export type TrialReminderDecisionInput = {
  now: Date;
  reminderAt: Date;
  expiresAt: Date;
  reminderSentAt?: Date | null;
};

function assertIdentifier(name: string, value: string): void {
  if (value.length === 0) {
    throw new Error(`Trial ${name} must not be empty`);
  }
}

function encodeIdentifier(value: string): string {
  return `${value.length}:${value}`;
}

function assertValidDate(name: string, value: Date): void {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`Trial ${name} must be a valid date`);
  }
}

export function createTrialIdempotencyKey(
  identity: TrialEligibilityIdentity,
): string {
  assertIdentifier("ownerId", identity.ownerId);
  assertIdentifier("businessId", identity.businessId);
  assertIdentifier("invitationId", identity.invitationId);

  return [
    "trial",
    encodeIdentifier(identity.ownerId),
    encodeIdentifier(identity.businessId),
    encodeIdentifier(identity.invitationId),
  ].join(":");
}

export function createTrialWindow(startedAt: Date): TrialWindow {
  assertValidDate("startedAt", startedAt);

  const startedAtMs = startedAt.getTime();
  const expiresAtMs = startedAtMs + TRIAL_DURATION_MS;

  return {
    startedAt: new Date(startedAtMs),
    reminderAt: new Date(expiresAtMs - TRIAL_REMINDER_LEAD_MS),
    expiresAt: new Date(expiresAtMs),
  };
}

export function shouldSendTrialReminder(
  input: TrialReminderDecisionInput,
): boolean {
  assertValidDate("now", input.now);
  assertValidDate("reminderAt", input.reminderAt);
  assertValidDate("expiresAt", input.expiresAt);

  if (input.reminderSentAt) {
    assertValidDate("reminderSentAt", input.reminderSentAt);
    return false;
  }

  const nowMs = input.now.getTime();
  return (
    nowMs >= input.reminderAt.getTime() && nowMs < input.expiresAt.getTime()
  );
}
