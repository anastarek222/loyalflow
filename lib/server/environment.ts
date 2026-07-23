import process from "node:process";

/**
 * Server-only runtime configuration. Do not import this module from Client
 * Components: it returns server credentials needed by database infrastructure.
 */
export type RuntimeEnvironment = Readonly<{
  databaseUrl: string;
  appUrl: string | null;
  googleSheetsConfigured: boolean;
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

function validateProductionAppUrl(value: string) {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.origin !== value
    ) {
      throw new Error("invalid public origin");
    }
  } catch {
    throw new EnvironmentValidationError(
      "NEXT_PUBLIC_APP_URL must be an HTTPS origin without a trailing slash."
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

  if (environment.NODE_ENV === "production") {
    getRequiredValue(environment, "AUTH_SECRET");

    if (!appUrl) {
      throw new EnvironmentValidationError(
        "Missing required server environment variable: NEXT_PUBLIC_APP_URL."
      );
    }

    validateProductionAppUrl(appUrl);
  }

  return {
    databaseUrl,
    appUrl,
    googleSheetsConfigured: Boolean(
      getTrimmedValue(environment, "GOOGLE_SPREADSHEET_ID")
    ),
  };
}
