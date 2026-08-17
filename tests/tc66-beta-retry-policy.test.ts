import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BETA_INTEGRATION_MAX_ATTEMPTS,
  BETA_QUEUE_MAX_RETRY_SECONDS,
  getBetaQueueRetryDelaySeconds,
  shouldRetryIntegrationFailure,
} from "@/lib/server/integrations/retry-policy";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("TC6.6 caps retryable provider failures at three durable attempts", () => {
  assert.equal(BETA_INTEGRATION_MAX_ATTEMPTS, 3);
  assert.equal(
    shouldRetryIntegrationFailure({ retryable: true, attemptCount: 1 }),
    true,
  );
  assert.equal(
    shouldRetryIntegrationFailure({ retryable: true, attemptCount: 2 }),
    true,
  );
  assert.equal(
    shouldRetryIntegrationFailure({ retryable: true, attemptCount: 3 }),
    false,
  );
  assert.equal(
    shouldRetryIntegrationFailure({ retryable: false, attemptCount: 1 }),
    false,
  );
  assert.throws(() =>
    shouldRetryIntegrationFailure({ retryable: true, attemptCount: 0 }),
  );
});

test("TC6.6 uses bounded exponential Queue retry delay without embedding tenant data", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map(getBetaQueueRetryDelaySeconds),
    [30, 60, 120, 240, 300, 300],
  );
  assert.equal(BETA_QUEUE_MAX_RETRY_SECONDS, 300);
  assert.throws(() => getBetaQueueRetryDelaySeconds(0));
});

test("TC6.6 worker terminalizes retryable failures at the durable attempt ceiling", () => {
  const worker = source("lib/server/integrations/worker.ts");
  const route = source("app/api/queues/integration-jobs/route.ts");
  const policy = source("lib/server/integrations/retry-policy.ts");

  assert.match(worker, /shouldRetryIntegrationFailure/);
  assert.match(worker, /attemptCount: claimed\.attemptCount/);
  assert.match(worker, /retryAt: retry \? new Date\(finishedAt\.getTime\(\) \+ 1\) : null/);
  assert.match(worker, /if \(retry\) throw new Error\("Retryable integration job failure\."\)/);
  assert.match(route, /retry: \(_error, metadata\) =>/);
  assert.match(route, /getBetaQueueRetryDelaySeconds\(metadata\.deliveryCount\)/);
  assert.doesNotMatch(policy, /businessId|customerId|userId|process\.env|provider/i);
});
