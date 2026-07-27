import process from "node:process";

import {
  EnvironmentValidationError,
  validateProductionEnvironment,
} from "@/lib/server/environment";
import { getGoogleSpreadsheetMetadata } from "@/lib/google-sheets";

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

function safeDatabaseDescriptor(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
  } catch {
    return "invalid-database-url";
  }
}

function checkDatabaseSsl(rawUrl: string): CheckResult {
  try {
    const url = new URL(rawUrl);
    const sslMode = url.searchParams.get("sslmode");

    if (sslMode === "verify-full") {
      return {
        name: "database TLS",
        ok: true,
        detail: "sslmode=verify-full",
      };
    }

    if (sslMode) {
      return {
        name: "database TLS",
        ok: true,
        detail: `sslmode=${sslMode}; verify-full is recommended when supported by the provider`,
      };
    }

    return {
      name: "database TLS",
      ok: false,
      detail: "DATABASE_URL has no sslmode query parameter",
    };
  } catch {
    return {
      name: "database TLS",
      ok: false,
      detail: "DATABASE_URL is not a valid URL",
    };
  }
}

async function main() {
  const checks: CheckResult[] = [];
  let prisma: (typeof import("@/lib/prisma"))["default"] | null = null;

  let environment;
  try {
    environment = validateProductionEnvironment(process.env);

    checks.push({
      name: "required production environment",
      ok: true,
      detail: "production identity, DATABASE_URL, AUTH_SECRET and NEXT_PUBLIC_APP_URL are present and valid",
    });
  } catch (error) {
    const detail =
      error instanceof EnvironmentValidationError
        ? error.message
        : "Production environment validation failed.";

    checks.push({
      name: "required production environment",
      ok: false,
      detail,
    });

    environment = null;
  }

  if (environment) {
    checks.push(checkDatabaseSsl(environment.databaseUrl));

    checks.push({
      name: "public application URL",
      ok: environment.appUrl?.startsWith("https://") === true,
      detail: environment.appUrl ?? "missing",
    });

    if (!environment.googleSheetsConfigured) {
      checks.push({
        name: "Google Sheets integration",
        ok: environment.googleSheetsConfigurationReason === "MISSING_SPREADSHEET_ID",
        detail: environment.googleSheetsConfigurationReason === "MISSING_SPREADSHEET_ID"
          ? "not configured (optional)"
          : `incomplete: ${environment.googleSheetsConfigurationReason}`,
      });
    } else {
      try {
        const metadata = await getGoogleSpreadsheetMetadata();
        checks.push({ name: "Google Sheets integration", ok: true, detail: `read-only authentication passed for ${metadata.title || "configured spreadsheet"}` });
      } catch (error) {
        checks.push({ name: "Google Sheets integration", ok: false, detail: error instanceof Error ? error.message : "read-only validation failed" });
      }
    }

    try {
      const prismaModule = await import("@/lib/prisma");
      prisma = prismaModule.default;
      await prisma.$queryRaw`SELECT 1`;
      checks.push({
        name: "database connectivity",
        ok: true,
        detail: safeDatabaseDescriptor(environment.databaseUrl),
      });

      const identity = await prisma.$queryRaw<Array<{ database: string }>>`
        SELECT current_database() AS database
      `;
      const actualDatabase = identity[0]?.database ?? "";
      const expectedDatabase = environment.productionDatabaseName ?? "";

      checks.push({
        name: "production database identity",
        ok:
          Boolean(expectedDatabase) &&
          actualDatabase === expectedDatabase &&
          !/(^|[_-])(test|dev|development|local|staging)([_-]|$)/i.test(actualDatabase),
        detail:
          actualDatabase === expectedDatabase
            ? "matches LOYALFLOW_PRODUCTION_DATABASE"
            : "does not match LOYALFLOW_PRODUCTION_DATABASE",
      });
    } catch {
      checks.push({
        name: "database connectivity",
        ok: false,
        detail: `${safeDatabaseDescriptor(environment.databaseUrl)} is unreachable`,
      });
    }
  }

  console.log("LoyalFlow production readiness");
  console.log("==============================");

  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}: ${check.detail}`);
  }

  const failed = checks.filter((check) => !check.ok);

  if (prisma) {
    await prisma.$disconnect();
  }

  if (failed.length > 0) {
    console.error(`\nProduction readiness failed: ${failed.length} blocking check(s).`);
    process.exitCode = 1;
    return;
  }

  console.log("\nProduction readiness checks passed.");
}

main().catch(() => {
  console.error("Production readiness verification failed unexpectedly.");
  process.exitCode = 1;
});
