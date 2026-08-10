export type PerformanceSample = Readonly<{
  status: number;
  durationMs: number;
}>;

export type PerformanceBudget = Readonly<{
  maxP95Ms: number;
  maxErrorRate: number;
  minSamples: number;
}>;

export type PerformanceBudgetResult = Readonly<{
  allowed: boolean;
  p95Ms: number | null;
  errorRate: number | null;
  sampleCount: number;
  reasons: readonly string[];
}>;

function percentile95(values: readonly number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index] ?? null;
}

function isValidSample(sample: PerformanceSample) {
  return (
    Number.isInteger(sample.status) &&
    sample.status >= 100 &&
    sample.status <= 599 &&
    Number.isFinite(sample.durationMs) &&
    sample.durationMs >= 0
  );
}

export function evaluatePerformanceBudget(
  samples: readonly PerformanceSample[],
  budget: PerformanceBudget,
): PerformanceBudgetResult {
  const validSamples = samples.filter(isValidSample);
  const reasons: string[] = [];

  if (validSamples.length < budget.minSamples) {
    reasons.push("insufficient_samples");
  }

  const p95Ms = percentile95(validSamples.map((sample) => sample.durationMs));
  const errorCount = validSamples.filter(
    (sample) => sample.status < 200 || sample.status >= 400,
  ).length;
  const errorRate = validSamples.length === 0 ? null : errorCount / validSamples.length;

  if (p95Ms !== null && p95Ms > budget.maxP95Ms) {
    reasons.push("p95_exceeded");
  }

  if (errorRate !== null && errorRate > budget.maxErrorRate) {
    reasons.push("error_rate_exceeded");
  }

  return {
    allowed: reasons.length === 0,
    p95Ms,
    errorRate,
    sampleCount: validSamples.length,
    reasons,
  };
}
