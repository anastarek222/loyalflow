import { getEnvironmentIdentity } from "@/lib/server/environment-identity";

export type StagingIsolationResult = Readonly<{
  required: boolean;
  allowed: boolean;
  reason:
    | "not_staging"
    | "ok"
    | "missing_expected_database"
    | "missing_expected_database_host"
    | "invalid_database_url"
    | "production_database_match"
    | "production_database_host_match"
    | "database_mismatch"
    | "database_host_mismatch";
}>;

function clean(value: string | undefined) {
  return value?.trim() || null;
}

function normalizeHost(value: string | null) {
  return value?.trim().toLowerCase().replace(/\.$/, "") || null;
}

function databaseHost(databaseUrl: string | null) {
  if (!databaseUrl) return null;

  try {
    return normalizeHost(new URL(databaseUrl).hostname);
  } catch {
    return null;
  }
}

export function evaluateStagingIsolation(
  environment: Record<string, string | undefined>,
  currentDatabase: string | null,
): StagingIsolationResult {
  const identity = getEnvironmentIdentity(environment);

  if (identity.environment !== "staging") {
    return { required: false, allowed: true, reason: "not_staging" };
  }

  const expectedDatabase = clean(environment.LOYALFLOW_STAGING_DATABASE);
  const productionDatabase = clean(environment.LOYALFLOW_PRODUCTION_DATABASE);
  const expectedHost = normalizeHost(clean(environment.LOYALFLOW_STAGING_DATABASE_HOST));
  const productionHost = normalizeHost(clean(environment.LOYALFLOW_PRODUCTION_DATABASE_HOST));
  const configuredDatabaseUrl = clean(environment.DATABASE_URL);
  const currentHost = databaseHost(configuredDatabaseUrl);

  if (!expectedDatabase) {
    return { required: true, allowed: false, reason: "missing_expected_database" };
  }

  if (!expectedHost) {
    return { required: true, allowed: false, reason: "missing_expected_database_host" };
  }

  if (configuredDatabaseUrl && !currentHost) {
    return { required: true, allowed: false, reason: "invalid_database_url" };
  }

  if (productionDatabase && productionHost && expectedDatabase === productionDatabase && expectedHost === productionHost) {
    return { required: true, allowed: false, reason: "production_database_match" };
  }

  if (productionHost && (expectedHost === productionHost || currentHost === productionHost)) {
    return { required: true, allowed: false, reason: "production_database_host_match" };
  }

  if (!currentDatabase || currentDatabase !== expectedDatabase) {
    return { required: true, allowed: false, reason: "database_mismatch" };
  }

  if (!currentHost || currentHost !== expectedHost) {
    return { required: true, allowed: false, reason: "database_host_mismatch" };
  }

  return { required: true, allowed: true, reason: "ok" };
}
