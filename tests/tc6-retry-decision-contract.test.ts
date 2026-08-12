import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  integrationRetryDecisions,
  type IntegrationFailureClassification,
} from "@loyalflow/contracts/integrations/health";
import { decideIntegrationRetry } from "@loyalflow/domain/integrations/health";

test("TC6.2 exposes only the approved provider-neutral retry decisions", () => {
  assert.deepEqual(integrationRetryDecisions, [
    "RETRY_ELIGIBLE",
    "DO_NOT_RETRY",
    "NOT_APPLICABLE",
  ]);
});

test("TC6.2 deterministically derives eligibility from failure classification", () => {
  const cases: ReadonlyArray<
    readonly [IntegrationFailureClassification, string]
  > = [
    ["RETRYABLE", "RETRY_ELIGIBLE"],
    ["TERMINAL", "DO_NOT_RETRY"],
    ["NONE", "NOT_APPLICABLE"],
  ];

  for (const [classification, expected] of cases) {
    assert.equal(decideIntegrationRetry(classification), expected);
  }
});

test("TC6.2 rejects unknown and malformed classifications without coercion", () => {
  for (const value of [
    "UNKNOWN",
    "retryable",
    "",
    null,
    undefined,
    true,
    1,
    { classification: "RETRYABLE" },
  ]) {
    assert.equal(decideIntegrationRetry(value), null);
  }
});

test("TC6.2 is a pure decision with no execution or hidden policy", () => {
  const contractSource = readFileSync(
    new URL("../packages/contracts/src/integrations/health.ts", import.meta.url),
    "utf8",
  );
  const domainSource = readFileSync(
    new URL("../packages/domain/src/integrations/health.ts", import.meta.url),
    "utf8",
  );
  const sources = `${contractSource}\n${domainSource}`;

  assert.doesNotMatch(
    sources,
    /fetch\(|prisma|googleapis|process\.env|setTimeout|setInterval|queue|worker|backoff|attemptLimit|maxAttempts|businessId|customerId|userId|payload|token|credential/i,
  );
  assert.doesNotMatch(
    domainSource,
    /RETRY_ELIGIBLE[\s\S]{0,120}(?:\b\d{2,}\b|Date\.now|new Date)/,
  );
});
