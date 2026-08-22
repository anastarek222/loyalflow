import process from "node:process";
import { getGoogleSheetsConfiguration, type GoogleSheetsConfigurationReason } from "@/lib/google-sheets";
import { validatePublicAppOrigin } from "@/lib/public-app-url";

/**
 * Server-only runtime configuration. Do not import this module from Client
 * Components: it returns server credentials needed by database infrastructure.
 */
export type RuntimeEnvironment = Readonly<{
  databaseUrl: string;
  appUrl: string | null;
  environmentName: string;
  releaseSha: string | null;
  productionDatabaseName: string | null;
  googleSheetsConfigured: boolean;
  googleSheetsConfigurationReason: GoogleSheetsConfigurationReason | null;
}>;

type EnvironmentSource = Record<string, string | undefined>;

export class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentValidationError";
  }
}

function getTrimmedValue(
  environment: EnvironmentSource,
  name: string
) {
  return environment[name]?.trim() || null;
}

function getRequiredValue(
  environment: EnvironmentSource,
  name: string
) {
  const value = getTrimmedValue(environment, name);

  if (!value) {
    throw new EnvironmentValidationError(
      `Missing required server environment variable: ${name}.`
    );
  }

  return value;
}

function validateEnvironmentName(value: string) {
  if (!/^[a-z0-9][a-z0-9_-]{1,31}$/i.test(value)) {
    throw new EnvironmentValidationError(
      "LOYALFLOW_ENVIRONMENT must be a short alphanumeric environment name."
    );
  }

  return value.toLowerCase();
}

function validateReleaseSha(value: string | null) {
  if (!value) return null;

  if (!/^[a-f0-9]{7,64}$/i.test(value)) {
    throw new EnvironmentValidationError(
      "LOYALFLOW_RELEASE_SHA must be a Git commit SHA."
    );
  }

  return value.toLowerCase();
}

function validateProductionAppUrl(value: string) {
  try {
    return validatePublicAppOrigin(value, {
      production: true,
    });
  } catch {
    throw new EnvironmentValidationError(
      "NEXT_PUBLIC_APP_URL must be a real non-local HTTPS origin without credentials, path, query, fragment, trailing slash, or placeholder domain."
    );
  }
}

function validateProductionLikeDatabaseTls(
  databaseUrl: string,
  environmentName: string
) {
  if (!["preview", "staging", "production"].includes(environmentName)) {
    return;
  }

  try {
    const url = new URL(databaseUrl);
    const sslmodes = url.searchParams.getAll("sslmode");

    if (
      sslmodes.length !== 1 ||
      !["require", "verify-ca", "verify-full"].includes(sslmodes[0])
    ) {
      throw new Error("invalid sslmode");
    }
  } catch {
    throw new EnvironmentValidationError(
      "DATABASE_URL must use exactly one sslmode=require, sslmode=verify-ca, or sslmode=verify-full in preview, staging, and production runtimes."
    );
  }
}

/**
 * Validates values used by the running application, never Prisma's
 * development-only shadow database configuration.
 */
export function validateRuntimeEnvironment(
  environment: EnvironmentSource = process.env
): RuntimeEnvironment {
  const databaseUrl = getRequiredValue(environment, "DATABASE_URL");
  const appUrl = getTrimmedValue(environment, "NEXT_PUBLIC_APP_URL");
  const environmentName = validateEnvironmentName(
    getTrimmedValue(environment, "LOYALFLOW_ENVIRONMENT") ??
      (environment.NODE_ENV === "production" ? "production" : "development")
  );
  const releaseSha = validateReleaseSha(
    getTrimmedValue(environment, "LOYALFLOW_RELEASE_SHA")
  );
  const productionDatabaseName = getTrimmedValue(
    environment,
    "LOYALFLOW_PRODUCTION_DATABASE"
  );

  if (environment.NODE_ENV === "production") {
    validateProductionLikeDatabaseTls(databaseUrl, environmentName);
    getRequiredValue(environment, "AUTH_SECRET");

    if (!appUrl) {
      throw new EnvironmentValidationError(
        "Missing required server environment variable: NEXT_PUBLIC_APP_URL."
      );
    }

    validateProductionAppUrl(appUrl);

  }

  const googleSheetsConfiguration = getGoogleSheetsConfiguration(environment);

  return {
    databaseUrl,
    appUrl,
    environmentName,
    releaseSha,
    productionDatabaseName,
    googleSheetsConfigured: googleSheetsConfiguration.configured,
    googleSheetsConfigurationReason: googleSheetsConfiguration.configured
      ? null
      : googleSheetsConfiguration.reason,
  };
}

export function validateProductionEnvironment(
  environment: EnvironmentSource = process.env
): RuntimeEnvironment {
  const resolved = validateRuntimeEnvironment({
    ...environment,
    NODE_ENV: "production",
  });

  const explicitEnvironment =
    getTrimmedValue(environment, "LOYALFLOW_ENVIRONMENT");

  if (explicitEnvironment !== "production") {
    throw new EnvironmentValidationError(
      "LOYALFLOW_ENVIRONMENT must explicitly be production for production deployment verification."
    );
  }

  if (!resolved.productionDatabaseName) {
    throw new EnvironmentValidationError(
      "Missing required server environment variable: LOYALFLOW_PRODUCTION_DATABASE."
    );
  }

  return resolved;
}
