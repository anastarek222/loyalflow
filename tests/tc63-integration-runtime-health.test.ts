import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { summarizeIntegrationRuntimeHealth } from "@/lib/integrations/runtime-health";

test("TC6.3 summarizes provider-neutral status and failure counts", () => {
  assert.deepEqual(
    summarizeIntegrationRuntimeHealth([
      { syncState: "PENDING", retryable: true, count: 2 },
      { syncState: "SUCCEEDED", retryable: false, count: 5 },
      { syncState: "FAILED", retryable: true, count: 3 },
      { syncState: "FAILED", retryable: false, count: 1 },
    ]),
    {
      total: 11,
      statusCounts: { PENDING: 2, SUCCEEDED: 5, FAILED: 4 },
      failureCounts: { retryable: 3, terminal: 1 },
    },
  );
});

test("TC6.3 fails closed for malformed groups", () => {
  assert.equal(
    summarizeIntegrationRuntimeHealth([
      { syncState: "UNKNOWN", retryable: false, count: 1 },
    ]),
    null,
  );
  assert.equal(
    summarizeIntegrationRuntimeHealth([
      { syncState: "FAILED", retryable: "yes", count: 1 },
    ]),
    null,
  );
  assert.equal(
    summarizeIntegrationRuntimeHealth([
      { syncState: "SUCCEEDED", retryable: false, count: -1 },
    ]),
    null,
  );
});

test("TC6.3 reader selects aggregate fields only and operations stays read-only", () => {
  const reader = readFileSync(
    new URL("../lib/server/integrations/runtime-health.ts", import.meta.url),
    "utf8",
  );
  const page = readFileSync(
    new URL("../app/operations/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(reader, /groupBy/);
  assert.match(reader, /googleSheetsSyncState/);
  assert.match(reader, /googleSheetsRetryable/);
  assert.doesNotMatch(
    reader,
    /googleSheetsLastError|businessId|customerId|credential|token|findMany|create\(|update\(|delete\(|upsert\(/i,
  );
  assert.match(page, /readIntegrationRuntimeHealth/);
  assert.doesNotMatch(page, /googleSheetsLastError|pendingSince|staleAfter|delayedAfter/);
});
