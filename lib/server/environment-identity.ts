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

function explicitEnvironment(value: string | null): Exclude<EnvironmentName, "unknown"> | null {
  return value === "development" || value === "test" || value === "preview" || value === "staging" || value === "production"
    ? value
    : null;
}

export function getEnvironmentIdentity(
  environment: Record<string, string | undefined> = process.env,
): EnvironmentIdentity {
  const explicit = explicitEnvironment(clean(environment.LOYALFLOW_ENVIRONMENT)?.toLowerCase() ?? null);
  const vercel = clean(environment.VERCEL_ENV)?.toLowerCase() ?? null;
  const node = clean(environment.NODE_ENV)?.toLowerCase() ?? null;

  let environmentName: EnvironmentName = "unknown";

  if (explicit) {
    const compatibleVercel =
      !vercel ||
      (explicit === "production" && vercel === "production") ||
      (explicit === "preview" && vercel === "preview") ||
      (explicit === "staging" && vercel === "preview") ||
      ((explicit === "development" || explicit === "test") && vercel !== "production");

    environmentName = compatibleVercel ? explicit : "unknown";
  } else if (vercel === "preview" || vercel === "production") {
    environmentName = vercel;
  } else if (node === "test" || node === "development" || node === "production") {
    environmentName = node;
  }

  return {
    environment: environmentName,
    deploymentType: environmentName === "development" ? "local" : environmentName === "test" ? "ci" : environmentName === "preview" ? "preview" : environmentName === "staging" ? "staging" : environmentName === "production" ? "production" : "unknown",
    isProduction: environmentName === "production",
    isPreview: environmentName === "preview" || environmentName === "staging",
    release: safeRelease(clean(environment.LOYALFLOW_RELEASE_SHA) ?? clean(environment.VERCEL_GIT_COMMIT_SHA) ?? clean(environment.GITHUB_SHA)),
    buildTimestamp: safeTimestamp(clean(environment.LOYALFLOW_BUILD_TIMESTAMP)),
  };
}
