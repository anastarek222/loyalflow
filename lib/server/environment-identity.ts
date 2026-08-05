import process from "node:process";

export type EnvironmentName = "development" | "test" | "preview" | "staging" | "production" | "unknown";

export type EnvironmentIdentity = Readonly<{
  environment: EnvironmentName;
  deploymentType: "local" | "ci" | "preview" | "staging" | "production" | "unknown";
  isProduction: boolean;
  isPreview: boolean;
  release: string | null;
  buildTimestamp: string | null;
}>;

function clean(value: string | undefined) {
  return value?.trim() || null;
}

function safeRelease(value: string | null) {
  return value && /^[a-f0-9]{7,64}$/i.test(value) ? value.slice(0, 12) : null;
}

function safeTimestamp(value: string | null) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;
}

export function getEnvironmentIdentity(
  environment: Record<string, string | undefined> = process.env,
): EnvironmentIdentity {
  const explicit = clean(environment.LOYALFLOW_ENVIRONMENT)?.toLowerCase();
  const vercel = clean(environment.VERCEL_ENV)?.toLowerCase();
  const node = clean(environment.NODE_ENV)?.toLowerCase();
  const explicitCandidates = [explicit, vercel].filter(
    (value): value is Exclude<EnvironmentName, "unknown"> =>
      value === "development" || value === "test" || value === "preview" || value === "staging" || value === "production",
  );
  // NODE_ENV=production is a runtime mode on both preview and production hosts;
  // it is not a conflicting deployment identity when an explicit platform signal exists.
  const candidates = explicitCandidates.length > 0
    ? explicitCandidates
    : [node].filter(
        (value): value is Exclude<EnvironmentName, "unknown"> =>
          value === "development" || value === "test" || value === "preview" || value === "staging" || value === "production",
      );
  const environmentName: EnvironmentName =
    new Set(candidates).size > 1
      ? "unknown"
      : explicit === "development" || explicit === "test" || explicit === "preview" || explicit === "staging" || explicit === "production"
      ? explicit
      : vercel === "preview" || vercel === "production"
        ? vercel
        : node === "test" || node === "development" || node === "production"
          ? node
          : "unknown";

  return {
    environment: environmentName,
    deploymentType: environmentName === "development" ? "local" : environmentName === "test" ? "ci" : environmentName === "preview" ? "preview" : environmentName === "staging" ? "staging" : environmentName === "production" ? "production" : "unknown",
    isProduction: environmentName === "production",
    isPreview: environmentName === "preview",
    release: safeRelease(clean(environment.LOYALFLOW_RELEASE_SHA) ?? clean(environment.VERCEL_GIT_COMMIT_SHA) ?? clean(environment.GITHUB_SHA)),
    buildTimestamp: safeTimestamp(clean(environment.LOYALFLOW_BUILD_TIMESTAMP)),
  };
}
