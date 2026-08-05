import { getEnvironmentIdentity } from "@/lib/server/environment-identity";

export type DatabaseScriptClass = "runtime-application" | "migration-deployer" | "development-migration-generator" | "seed-fixture" | "destructive-reset" | "controlled-operation" | "read-only-verification" | "backup-restore-documentation";

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
  return identity;
}
