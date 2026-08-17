export const BETA_RECONCILIATION_TRIGGER_INTERVAL_MS = 5 * 60 * 1000;
export const BETA_RECONCILIATION_TRIGGER_LIMIT = 25;

export type BetaReconciliationTriggerPolicyInput = Readonly<{
  now: Date;
  lastStartedAt: Date | null;
}>;

/**
 * Pure beta-only trigger policy. This intentionally does not own persistence,
 * scheduling, authentication, provider execution, or environment configuration.
 * A future invocation adapter may call this policy before running reconciliation.
 */
export function shouldStartBetaReconciliation(
  input: BetaReconciliationTriggerPolicyInput,
) {
  if (!Number.isFinite(input.now.getTime())) {
    throw new Error("now must be a valid date.");
  }

  if (!input.lastStartedAt) return true;
  if (!Number.isFinite(input.lastStartedAt.getTime())) {
    throw new Error("lastStartedAt must be a valid date.");
  }
  if (input.lastStartedAt.getTime() > input.now.getTime()) {
    throw new Error("lastStartedAt cannot be later than now.");
  }

  return (
    input.now.getTime() - input.lastStartedAt.getTime() >=
    BETA_RECONCILIATION_TRIGGER_INTERVAL_MS
  );
}
