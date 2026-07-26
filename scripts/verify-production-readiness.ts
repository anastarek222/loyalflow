import process from "node:process";

import {
  EnvironmentValidationError,
  validateRuntimeEnvironment,
} from "@/lib/server/environment";

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
    environment = validateRuntimeEnvironment({
      ...process.env,
      NODE_ENV: "production",
    });

    checks.push({
      name: "required production environment",
      ok: true,
      detail: "DATABASE_URL, AUTH_SECRET and NEXT_PUBLIC_APP_URL are present and valid",
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

    checks.push({
      name: "Google Sheets integration",
      ok: true,
      detail: environment.googleSheetsConfigured ? "configured" : "not configured (optional)",
    });

    try {
      const prismaModule = await import("@/lib/prisma");
      prisma = prismaModule.default;
      await prisma.$queryRaw`SELECT 1`;
      checks.push({
        name: "database connectivity",
        ok: true,
        detail: safeDatabaseDescriptor(environment.databaseUrl),
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
