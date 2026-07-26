import process from "node:process";

function clean(value: string | undefined) {
  return value?.trim() || null;
}

function safeReleaseSha(value: string | null) {
  if (!value) return null;
  return /^[a-f0-9]{7,64}$/i.test(value) ? value.slice(0, 12) : null;
}

function safeEnvironmentName(value: string | null) {
  if (!value) return "unknown";
  return /^[a-z0-9][a-z0-9_-]{1,31}$/i.test(value)
    ? value.toLowerCase()
    : "unknown";
}

export type PublicReleaseMetadata = Readonly<{
  environment: string;
  release: string | null;
}>;

export function getPublicReleaseMetadata(
  environment: NodeJS.ProcessEnv = process.env,
): PublicReleaseMetadata {
  const environmentName = safeEnvironmentName(
    clean(environment.LOYALFLOW_ENVIRONMENT) ??
      (environment.NODE_ENV === "production" ? "production" : "development"),
  );

  const release = safeReleaseSha(
    clean(environment.LOYALFLOW_RELEASE_SHA) ??
      clean(environment.VERCEL_GIT_COMMIT_SHA) ??
      clean(environment.GITHUB_SHA),
  );

  return {
    environment: environmentName,
    release,
  };
}
