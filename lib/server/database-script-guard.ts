import { getEnvironmentIdentity } from "@/lib/server/environment-identity";

export type DatabaseScriptClass =
  | "runtime-application"
  | "migration-deployer"
  | "development-migration-generator"
  | "seed-fixture"
  | "destructive-reset"
  | "controlled-operation"
  | "read-only-verification"
  | "backup-restore-documentation";

export function assertDatabaseScriptEnvironment(
  scriptClass: DatabaseScriptClass,
  environment: Record<string, string | undefined> = process.env,
) {
  const identity = getEnvironmentIdentity(environment);
  const destructive = scriptClass === "destructive-reset" || scriptClass === "seed-fixture";
  const privileged = scriptClass === "destructive-reset" || scriptClass === "controlled-operation";

  if (identity.environment === "unknown") {
    throw new Error("Database script refused: environment identity is ambiguous.");
  }
  if ((destructive || scriptClass === "controlled-operation") && (identity.isPreview || identity.environment === "staging")) {
    throw new Error("Database script refused outside development or test for this script class.");
  }
  if (privileged && identity.isProduction && environment.LOYALFLOW_ALLOW_PRODUCTION_MUTATION !== "I_UNDERSTAND_PRODUCTION_MUTATION") {
    throw new Error("Database script refused production execution without the documented explicit override.");
  }
  if (scriptClass === "seed-fixture" && !["development", "test"].includes(identity.environment)) {
    throw new Error("Fixture script refused outside development or test.");
  }

  if (scriptClass === "backup-restore-documentation") {
    const databaseUrl = environment.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required for backup-restore-documentation");
    }

    if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
      throw new Error("DATABASE_URL must use postgresql:// or postgres:// protocol");
    }

    try {
      const url = new URL(databaseUrl);
      if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
        throw new Error(`Database host must be localhost or 127.0.0.1, got: ${url.hostname}`);
      }
      if (environment.LOYALFLOW_ALLOW_DISPOSABLE_DB !== "1") {
        throw new Error(
          "LOYALFLOW_ALLOW_DISPOSABLE_DB must be set to '1' to allow backup/restore on a disposable test database",
        );
      }
      const pathname = url.pathname;
      if (!pathname || pathname === "/") {
        throw new Error("DATABASE_URL must contain a database name");
      }
      const databaseName = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      if (databaseName.includes("/") || databaseName.includes("%")) {
        throw new Error("Database name must not contain path segments or encoded characters");
      }
      if (url.hash) {
        throw new Error("DATABASE_URL must not contain a fragment");
      }
      if (!databaseName.endsWith("_test")) {
        throw new Error(`Database name must end with '_test', got: ${databaseName}`);
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error("DATABASE_URL is not a valid URL");
      }

      throw error;
    }
  }

  return identity;
}
