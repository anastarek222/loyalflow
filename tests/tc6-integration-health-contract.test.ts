import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  integrationExecutionStatuses,
  integrationFailureClassifications,
  pendingAgingBuckets,
} from "@loyalflow/contracts/integrations/health";
import {
  aggregateIntegrationHealth,
  mapGoogleSheetsSyncStateToHealthObservation,
} from "@loyalflow/domain/integrations/health";

const thresholds = { delayedAfterMs: 100, staleAfterMs: 300 } as const;

test("TC6.1 exposes only the approved provider-neutral classifications", () => {
  assert.deepEqual(integrationExecutionStatuses, [
    "PENDING",
    "SUCCEEDED",
    "FAILED",
  ]);
  assert.deepEqual(integrationFailureClassifications, [
    "RETRYABLE",
    "TERMINAL",
    "NONE",
  ]);
  assert.deepEqual(pendingAgingBuckets, ["fresh", "delayed", "stale"]);
});

test("TC6.1 maps current Google Sheets state without provider details", () => {
  assert.deepEqual(
    mapGoogleSheetsSyncStateToHealthObservation({
      syncState: "PENDING",
      retryable: true,
      pendingSinceMs: 50,
    }),
    {
      status: "PENDING",
      failureClassification: "NONE",
      pendingSinceMs: 50,
    },
  );
  assert.deepEqual(
    mapGoogleSheetsSyncStateToHealthObservation({
      syncState: "SUCCEEDED",
      retryable: false,
      pendingSinceMs: null,
    }),
    {
      status: "SUCCEEDED",
      failureClassification: "NONE",
      pendingSinceMs: null,
    },
  );
  assert.equal(
    mapGoogleSheetsSyncStateToHealthObservation({
      syncState: "UNKNOWN",
      retryable: false,
      pendingSinceMs: null,
    }),
    null,
  );
  assert.equal(
    mapGoogleSheetsSyncStateToHealthObservation({
      syncState: "FAILED",
      retryable: "yes",
      pendingSinceMs: null,
    }),
    null,
  );
});

test("TC6.1 aggregates status, failure class, and pending age counts", () => {
  const observations = [
    { status: "PENDING", failureClassification: "NONE", pendingSinceMs: 950 },
    { status: "PENDING", failureClassification: "NONE", pendingSinceMs: 800 },
    { status: "PENDING", failureClassification: "NONE", pendingSinceMs: 600 },
    { status: "SUCCEEDED", failureClassification: "NONE", pendingSinceMs: null },
    { status: "FAILED", failureClassification: "RETRYABLE", pendingSinceMs: null },
    { status: "FAILED", failureClassification: "TERMINAL", pendingSinceMs: null },
  ] as const;

  assert.deepEqual(
    aggregateIntegrationHealth({
      observations,
      observedAtMs: 1_000,
      pendingAgingThresholds: thresholds,
    }),
    {
      ok: true,
      aggregate: {
        totalExecutions: 6,
        classifiedExecutions: 6,
        rejectedExecutions: 0,
        statusCounts: { PENDING: 3, SUCCEEDED: 1, FAILED: 2 },
        failureCounts: { RETRYABLE: 1, TERMINAL: 1 },
        pendingAgingCounts: { fresh: 1, delayed: 1, stale: 1 },
      },
    },
  );
});

test("TC6.1 assigns exact aging boundaries deterministically", () => {
  const result = aggregateIntegrationHealth({
    observations: [
      { status: "PENDING", failureClassification: "NONE", pendingSinceMs: 901 },
      { status: "PENDING", failureClassification: "NONE", pendingSinceMs: 900 },
      { status: "PENDING", failureClassification: "NONE", pendingSinceMs: 701 },
      { status: "PENDING", failureClassification: "NONE", pendingSinceMs: 700 },
    ],
    observedAtMs: 1_000,
    pendingAgingThresholds: thresholds,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.aggregate.pendingAgingCounts, {
      fresh: 1,
      delayed: 2,
      stale: 1,
    });
  }
});

test("TC6.1 rejects unknown or inconsistent observations without coercion", () => {
  const result = aggregateIntegrationHealth({
    observations: [
      { status: "UNKNOWN", failureClassification: "NONE", pendingSinceMs: null },
      { status: "FAILED", failureClassification: "NONE", pendingSinceMs: null },
      { status: "PENDING", failureClassification: "NONE", pendingSinceMs: 1_001 },
      { status: "SUCCEEDED", failureClassification: "NONE", pendingSinceMs: null },
    ],
    observedAtMs: 1_000,
    pendingAgingThresholds: thresholds,
  });

  assert.deepEqual(result, {
    ok: true,
    aggregate: {
      totalExecutions: 4,
      classifiedExecutions: 1,
      rejectedExecutions: 3,
      statusCounts: { PENDING: 0, SUCCEEDED: 1, FAILED: 0 },
      failureCounts: { RETRYABLE: 0, TERMINAL: 0 },
      pendingAgingCounts: { fresh: 0, delayed: 0, stale: 0 },
    },
  });
});

test("TC6.1 fails closed for invalid clocks and unapproved aging thresholds", () => {
  assert.deepEqual(
    aggregateIntegrationHealth({
      observations: [],
      observedAtMs: Number.NaN,
      pendingAgingThresholds: thresholds,
    }),
    { ok: false, reason: "INVALID_CLOCK" },
  );
  assert.deepEqual(
    aggregateIntegrationHealth({
      observations: [],
      observedAtMs: 1_000,
      pendingAgingThresholds: { delayedAfterMs: 300, staleAfterMs: 300 },
    }),
    { ok: false, reason: "INVALID_AGING_THRESHOLDS" },
  );
});

test("TC6.1 remains pure and excludes sensitive/provider/runtime fields", () => {
  const sources = [
    readFileSync(
      new URL("../packages/contracts/src/integrations/health.ts", import.meta.url),
      "utf8",
    ),
    readFileSync(
      new URL("../packages/domain/src/integrations/health.ts", import.meta.url),
      "utf8",
    ),
  ].join("\n");

  assert.doesNotMatch(
    sources,
    /businessId|customerId|userId|errorMessage|payload|token|credential|stack|fetch\(|prisma|googleapis|process\.env|next\//i,
  );
});

test("TC6.1 aggregate cannot echo sensitive fields from an input object", () => {
  const result = aggregateIntegrationHealth({
    observations: [
      {
        status: "FAILED",
        failureClassification: "TERMINAL",
        pendingSinceMs: null,
        businessId: "must-not-escape",
        errorMessage: "must-not-escape",
        providerResponse: { mustNotEscape: true },
      },
    ],
    observedAtMs: 1_000,
    pendingAgingThresholds: thresholds,
  });

  assert.equal(result.ok, true);
  assert.doesNotMatch(JSON.stringify(result), /must-not-escape|businessId|errorMessage|providerResponse/);
});
