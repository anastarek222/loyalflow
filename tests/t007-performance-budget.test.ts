import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePerformanceBudget } from "@/lib/uat/performance-budget";

const budget = {
  maxP95Ms: 1500,
  maxErrorRate: 0.02,
  minSamples: 20,
};

test("T007 performance budget accepts a healthy staging sample set", () => {
  const samples = Array.from({ length: 20 }, (_, index) => ({
    status: 200,
    durationMs: 300 + index * 20,
  }));

  const result = evaluatePerformanceBudget(samples, budget);

  assert.equal(result.allowed, true);
  assert.equal(result.sampleCount, 20);
  assert.equal(result.errorRate, 0);
  assert.deepEqual(result.reasons, []);
});

test("T007 performance budget fails closed when evidence is undersampled", () => {
  const result = evaluatePerformanceBudget(
    [{ status: 200, durationMs: 250 }],
    budget,
  );

  assert.equal(result.allowed, false);
  assert.deepEqual(result.reasons, ["insufficient_samples"]);
});

test("T007 performance budget rejects excessive latency and errors", () => {
  const samples = Array.from({ length: 20 }, (_, index) => ({
    status: index < 2 ? 500 : 200,
    durationMs: index >= 18 ? 2200 : 400,
  }));

  const result = evaluatePerformanceBudget(samples, budget);

  assert.equal(result.allowed, false);
  assert.equal(result.errorRate, 0.1);
  assert.ok(result.reasons.includes("p95_exceeded"));
  assert.ok(result.reasons.includes("error_rate_exceeded"));
});

test("T007 performance budget ignores malformed duration samples instead of treating them as evidence", () => {
  const samples = [
    ...Array.from({ length: 19 }, () => ({ status: 200, durationMs: 400 })),
    { status: 200, durationMs: Number.NaN },
  ];

  const result = evaluatePerformanceBudget(samples, budget);

  assert.equal(result.allowed, false);
  assert.equal(result.sampleCount, 19);
  assert.ok(result.reasons.includes("insufficient_samples"));
});

test("T007 performance budget ignores malformed HTTP statuses instead of treating them as healthy evidence", () => {
  const samples = [
    ...Array.from({ length: 19 }, () => ({ status: 200, durationMs: 400 })),
    { status: Number.NaN, durationMs: 400 },
  ];

  const result = evaluatePerformanceBudget(samples, budget);

  assert.equal(result.allowed, false);
  assert.equal(result.sampleCount, 19);
  assert.ok(result.reasons.includes("insufficient_samples"));
});
