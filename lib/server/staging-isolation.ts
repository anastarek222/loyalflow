import { getEnvironmentIdentity } from "@/lib/server/environment-identity";

export type StagingIsolationResult = Readonly<{
  required: boolean;
  allowed: boolean;
  reason: "not_staging" | "ok" | "missing_expected_database" | "production_database_match" | "database_mismatch";
}>;

function clean(value: string | undefined) {
  return value?.trim() || null;
}

export function evaluateStagingIsolation(
  environment: Record<string, string | undefined>,
  currentDatabase: string | null,
): StagingIsolationResult {
  const identity = getEnvironmentIdentity(environment);

  if (identity.environment !== "staging") {
    return { required: false, allowed: true, reason: "not_staging" };
  }

  const expected = clean(environment.LOYALFLOW_STAGING_DATABASE);
  const production = clean(environment.LOYALFLOW_PRODUCTION_DATABASE);

  if (!expected) {
    return { required: true, allowed: false, reason: "missing_expected_database" };
  }

  if ((production && expected === production) || (production && currentDatabase === production)) {
    return { required: true, allowed: false, reason: "production_database_match" };
  }

  if (!currentDatabase || currentDatabase !== expected) {
    return { required: true, allowed: false, reason: "database_mismatch" };
  }

  return { required: true, allowed: true, reason: "ok" };
}
