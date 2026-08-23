import { evaluatePerformanceBudget } from "@/lib/uat/performance-budget";

const rawBaseUrl = process.env.STAGING_UAT_BASE_URL?.trim();
if (!rawBaseUrl) {
  throw new Error("STAGING_UAT_BASE_URL is required.");
}

const baseUrl = new URL(rawBaseUrl);
if (baseUrl.protocol !== "https:") {
  throw new Error("STAGING_UAT_BASE_URL must use HTTPS.");
}

const vercelProtectionBypass =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const requestHeaders = vercelProtectionBypass
  ? {
      "x-vercel-protection-bypass": vercelProtectionBypass,
    }
  : undefined;

const healthUrl = new URL("/api/health", baseUrl);
const preflight = await fetch(healthUrl, {
  cache: "no-store",
  headers: requestHeaders,
  redirect: "error",
});

if (!preflight.ok) {
  throw new Error("Staging health preflight failed.");
}

const preflightBody = (await preflight.json()) as {
  ok?: unknown;
  status?: unknown;
  environment?: unknown;
};

if (
  preflightBody.ok !== true ||
  preflightBody.status !== "ready" ||
  preflightBody.environment !== "staging"
) {
  throw new Error("STAGING_UAT_BASE_URL must identify an isolated ready staging environment.");
}

const sampleCount = 20;
const samples = [];

for (let index = 0; index < sampleCount; index += 1) {
  const startedAt = performance.now();
  const response = await fetch(healthUrl, {
    cache: "no-store",
    headers: requestHeaders,
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
