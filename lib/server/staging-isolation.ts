import { getEnvironmentIdentity } from "@/lib/server/environment-identity";

export type StagingIsolationResult = Readonly<{
  required: boolean;
  allowed: boolean;
  reason:
    | "not_staging"
    | "ok"
    | "missing_staging_host"
    | "invalid_staging_host"
    | "missing_production_host"
    | "invalid_production_host"
    | "missing_database_url"
    | "invalid_database_url"
    | "staging_production_host_match"
    | "production_host_match"
    | "staging_host_mismatch";
}>;

type HostIdentity =
  | Readonly<{ status: "missing" }>
  | Readonly<{ status: "invalid" }>
  | Readonly<{ status: "valid"; identity: string }>;

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const NEON_POOLER_LABEL = /^(ep-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)-pooler$/;

function normalizeHost(value: string | undefined): HostIdentity {
  const trimmed = value?.trim();

  if (!trimmed) {
    return { status: "missing" };
  }

  const host = (
    trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed
  ).toLowerCase();
  const labels = host.split(".");

  if (host.length > 253 || labels.some((label) => !DNS_LABEL.test(label))) {
    return { status: "invalid" };
  }

  const neonPooler = labels[0]?.match(NEON_POOLER_LABEL);
  if (neonPooler) {
    labels[0] = neonPooler[1];
  }

  return { status: "valid", identity: labels.join(".") };
}

function getRuntimeHost(databaseUrl: string | undefined): HostIdentity {
  const trimmed = databaseUrl?.trim();

  if (!trimmed) {
    return { status: "missing" };
  }

  try {
    const url = new URL(trimmed);

    if (
      (url.protocol !== "postgres:" && url.protocol !== "postgresql:") ||
      !url.hostname
    ) {
      return { status: "invalid" };
    }

    return normalizeHost(url.hostname);
  } catch {
    return { status: "invalid" };
  }
}

export function evaluateStagingIsolation(
  environment: Record<string, string | undefined>,
  databaseUrl: string | undefined,
): StagingIsolationResult {
  const identity = getEnvironmentIdentity(environment);

  if (identity.environment !== "staging") {
    return { required: false, allowed: true, reason: "not_staging" };
  }

  const staging = normalizeHost(environment.LOYALFLOW_STAGING_DATABASE_HOST);
  if (staging.status === "missing") {
    return { required: true, allowed: false, reason: "missing_staging_host" };
  }

  if (staging.status === "invalid") {
    return { required: true, allowed: false, reason: "invalid_staging_host" };
  }

  const production = normalizeHost(
    environment.LOYALFLOW_PRODUCTION_DATABASE_HOST,
  );
  if (production.status === "missing") {
    return {
      required: true,
      allowed: false,
      reason: "missing_production_host",
    };
  }

  if (production.status === "invalid") {
    return {
      required: true,
      allowed: false,
      reason: "invalid_production_host",
    };
  }

  if (staging.identity === production.identity) {
    return {
      required: true,
      allowed: false,
      reason: "staging_production_host_match",
    };
  }

  const runtime = getRuntimeHost(databaseUrl);
  if (runtime.status === "missing") {
    return { required: true, allowed: false, reason: "missing_database_url" };
  }

  if (runtime.status === "invalid") {
    return { required: true, allowed: false, reason: "invalid_database_url" };
  }

  if (runtime.identity === production.identity) {
    return { required: true, allowed: false, reason: "production_host_match" };
  }

  if (runtime.identity !== staging.identity) {
    return { required: true, allowed: false, reason: "staging_host_mismatch" };
  }

  return { required: true, allowed: true, reason: "ok" };
}
