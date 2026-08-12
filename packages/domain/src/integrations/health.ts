import {
  integrationExecutionStatuses,
  integrationFailureClassifications,
  type IntegrationExecutionStatus,
  type IntegrationFailureClassification,
  type IntegrationHealthAggregationResult,
  type IntegrationHealthObservation,
  type PendingAgingBucket,
  type PendingAgingThresholds,
} from "@loyalflow/contracts/integrations/health";

type CurrentGoogleSheetsSyncState = Readonly<{
  syncState: unknown;
  retryable: unknown;
  pendingSinceMs: unknown;
}>;

const statusSet = new Set<unknown>(integrationExecutionStatuses);
const failureClassificationSet = new Set<unknown>(
  integrationFailureClassifications,
);

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isStatus(value: unknown): value is IntegrationExecutionStatus {
  return statusSet.has(value);
}

function isFailureClassification(
  value: unknown,
): value is IntegrationFailureClassification {
  return failureClassificationSet.has(value);
}

function isValidObservation(
  value: unknown,
  observedAtMs: number,
): value is IntegrationHealthObservation {
  if (typeof value !== "object" || value === null) return false;

  const observation = value as Record<string, unknown>;
  if (
    !isStatus(observation.status) ||
    !isFailureClassification(observation.failureClassification)
  ) {
    return false;
  }

  if (observation.status === "FAILED") {
    return (
      observation.pendingSinceMs === null &&
      observation.failureClassification !== "NONE"
    );
  }

  if (observation.failureClassification !== "NONE") return false;

  if (observation.status === "SUCCEEDED") {
    return observation.pendingSinceMs === null;
  }

  return (
    isNonNegativeSafeInteger(observation.pendingSinceMs) &&
    observation.pendingSinceMs <= observedAtMs
  );
}

function validThresholds(
  thresholds: PendingAgingThresholds,
): thresholds is PendingAgingThresholds {
  return (
    isNonNegativeSafeInteger(thresholds.delayedAfterMs) &&
    thresholds.delayedAfterMs > 0 &&
    isNonNegativeSafeInteger(thresholds.staleAfterMs) &&
    thresholds.staleAfterMs > thresholds.delayedAfterMs
  );
}

function classifyPendingAge(
  ageMs: number,
  thresholds: PendingAgingThresholds,
): PendingAgingBucket {
  if (ageMs >= thresholds.staleAfterMs) return "stale";
  if (ageMs >= thresholds.delayedAfterMs) return "delayed";
  return "fresh";
}

/**
 * Pure compatibility adapter for the fields already recorded by the current
 * Google Sheets integration. Callers must provide the approved pending-start
 * instant; this adapter does not infer it from an unrelated timestamp.
 */
export function mapGoogleSheetsSyncStateToHealthObservation(
  input: CurrentGoogleSheetsSyncState,
): IntegrationHealthObservation | null {
  if (!isStatus(input.syncState)) return null;

  if (input.syncState === "PENDING") {
    if (!isNonNegativeSafeInteger(input.pendingSinceMs)) return null;
    return {
      status: "PENDING",
      failureClassification: "NONE",
      pendingSinceMs: input.pendingSinceMs,
    };
  }

  if (input.syncState === "SUCCEEDED") {
    return {
      status: "SUCCEEDED",
      failureClassification: "NONE",
      pendingSinceMs: null,
    };
  }

  if (typeof input.retryable !== "boolean") return null;
  return {
    status: "FAILED",
    failureClassification: input.retryable ? "RETRYABLE" : "TERMINAL",
    pendingSinceMs: null,
  };
}

/**
 * Aggregates only privacy-minimized observations. Invalid observations are
 * counted but never coerced into a healthy or failed state.
 */
export function aggregateIntegrationHealth(input: Readonly<{
  observations: readonly unknown[];
  observedAtMs: number;
  pendingAgingThresholds: PendingAgingThresholds;
}>): IntegrationHealthAggregationResult {
  if (!isNonNegativeSafeInteger(input.observedAtMs)) {
    return { ok: false, reason: "INVALID_CLOCK" };
  }
  if (!validThresholds(input.pendingAgingThresholds)) {
    return { ok: false, reason: "INVALID_AGING_THRESHOLDS" };
  }

  const statusCounts: Record<IntegrationExecutionStatus, number> = {
    PENDING: 0,
    SUCCEEDED: 0,
    FAILED: 0,
  };
  const failureCounts = { RETRYABLE: 0, TERMINAL: 0 };
  const pendingAgingCounts: Record<PendingAgingBucket, number> = {
    fresh: 0,
    delayed: 0,
    stale: 0,
  };
  let rejectedExecutions = 0;

  for (const observation of input.observations) {
    if (!isValidObservation(observation, input.observedAtMs)) {
      rejectedExecutions += 1;
      continue;
    }

    statusCounts[observation.status] += 1;
    if (observation.status === "FAILED") {
      if (observation.failureClassification === "RETRYABLE") {
        failureCounts.RETRYABLE += 1;
      } else {
        failureCounts.TERMINAL += 1;
      }
    } else if (observation.status === "PENDING") {
      pendingAgingCounts[
        classifyPendingAge(
          input.observedAtMs - observation.pendingSinceMs,
          input.pendingAgingThresholds,
        )
      ] += 1;
    }
  }

  return {
    ok: true,
    aggregate: {
      totalExecutions: input.observations.length,
      classifiedExecutions: input.observations.length - rejectedExecutions,
      rejectedExecutions,
      statusCounts,
      failureCounts,
      pendingAgingCounts,
    },
  };
}
