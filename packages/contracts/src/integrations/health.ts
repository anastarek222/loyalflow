export const integrationExecutionStatuses = [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
] as const;

export type IntegrationExecutionStatus =
  (typeof integrationExecutionStatuses)[number];

export const integrationFailureClassifications = [
  "RETRYABLE",
  "TERMINAL",
  "NONE",
] as const;

export type IntegrationFailureClassification =
  (typeof integrationFailureClassifications)[number];

export const pendingAgingBuckets = ["fresh", "delayed", "stale"] as const;

export type PendingAgingBucket = (typeof pendingAgingBuckets)[number];

/**
 * A privacy-minimized, provider-neutral observation. It deliberately contains
 * only the classification and the timestamp required for deterministic aging.
 */
export type IntegrationHealthObservation =
  | Readonly<{
      status: "PENDING";
      failureClassification: "NONE";
      pendingSinceMs: number;
    }>
  | Readonly<{
      status: "SUCCEEDED";
      failureClassification: "NONE";
      pendingSinceMs: null;
    }>
  | Readonly<{
      status: "FAILED";
      failureClassification: Exclude<
        IntegrationFailureClassification,
        "NONE"
      >;
      pendingSinceMs: null;
    }>;

export type PendingAgingThresholds = Readonly<{
  delayedAfterMs: number;
  staleAfterMs: number;
}>;

export type IntegrationHealthAggregate = Readonly<{
  totalExecutions: number;
  classifiedExecutions: number;
  rejectedExecutions: number;
  statusCounts: Readonly<Record<IntegrationExecutionStatus, number>>;
  failureCounts: Readonly<
    Record<Exclude<IntegrationFailureClassification, "NONE">, number>
  >;
  pendingAgingCounts: Readonly<Record<PendingAgingBucket, number>>;
}>;

export type IntegrationHealthAggregationResult =
  | Readonly<{ ok: true; aggregate: IntegrationHealthAggregate }>
  | Readonly<{
      ok: false;
      reason: "INVALID_CLOCK" | "INVALID_AGING_THRESHOLDS";
    }>;
