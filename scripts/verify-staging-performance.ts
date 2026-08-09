import { evaluatePerformanceBudget } from "@/lib/uat/performance-budget";

const rawBaseUrl = process.env.STAGING_UAT_BASE_URL?.trim();
if (!rawBaseUrl) {
  throw new Error("STAGING_UAT_BASE_URL is required.");
}

const baseUrl = new URL(rawBaseUrl);
if (baseUrl.protocol !== "https:") {
  throw new Error("STAGING_UAT_BASE_URL must use HTTPS.");
}

const sampleCount = 20;
const samples = [];

for (let index = 0; index < sampleCount; index += 1) {
  const startedAt = performance.now();
  const response = await fetch(new URL("/api/health", baseUrl), {
    cache: "no-store",
    redirect: "error",
  });
  const durationMs = performance.now() - startedAt;
  samples.push({ status: response.status, durationMs });
}

const result = evaluatePerformanceBudget(samples, {
  maxP95Ms: 1500,
  maxErrorRate: 0.02,
  minSamples: sampleCount,
});

console.log(
  JSON.stringify(
    {
      sampleCount: result.sampleCount,
      p95Ms: result.p95Ms === null ? null : Math.round(result.p95Ms),
      errorRate: result.errorRate,
      allowed: result.allowed,
      reasons: result.reasons,
    },
    null,
    2,
  ),
);

if (!result.allowed) {
  process.exitCode = 1;
}
