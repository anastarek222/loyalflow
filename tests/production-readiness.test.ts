import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { checkReadiness } from "@/lib/health/readiness";
import {
  EnvironmentValidationError,
  validateRuntimeEnvironment,
} from "@/lib/server/environment";
import { getSafeErrorMessage } from "@/lib/server/logging";

const root = process.cwd();

function source(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function productionEnvironment(
  overrides: Record<string, string | undefined> = {}
) {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:database-secret@db.example.test/loyalflow",
    AUTH_SECRET: "auth-secret-value",
    NEXT_PUBLIC_APP_URL: "https://app.example.test",
    ...overrides,
  };
}

test("runtime environment validation reports missing production values without secrets", () => {
  const databaseUrl = "postgresql://user:database-secret@db.example.test/loyalflow";
  const authSecret = "auth-secret-value";

  assert.throws(
    () =>
      validateRuntimeEnvironment(
        productionEnvironment({
          DATABASE_URL: undefined,
          AUTH_SECRET: authSecret,
        })
      ),
    (error: unknown) => {
      assert.ok(error instanceof EnvironmentValidationError);
      assert.match(error.message, /DATABASE_URL/);
      assert.doesNotMatch(error.message, new RegExp(databaseUrl));
      assert.doesNotMatch(error.message, new RegExp(authSecret));
      return true;
    }
  );

  assert.throws(
    () =>
      validateRuntimeEnvironment(
        productionEnvironment({ AUTH_SECRET: undefined })
      ),
    /AUTH_SECRET/
  );
});

test("optional integration configuration does not block a valid core runtime", () => {
  const environment = validateRuntimeEnvironment(productionEnvironment());

  assert.equal(environment.googleSheetsConfigured, false);
  assert.equal(environment.appUrl, "https://app.example.test");
});

test("server environment validation is not imported by Client Components", () => {
  const componentsDirectory = path.join(root, "components");
  const components = fs.readdirSync(componentsDirectory).filter((file) => file.endsWith(".tsx"));

  for (const file of components) {
    const component = fs.readFileSync(path.join(componentsDirectory, file), "utf8");

    if (component.startsWith('"use client"') || component.startsWith("'use client'")) {
      assert.doesNotMatch(component, /lib\/server\/environment/);
    }
  }
});

test("readiness is dependency-aware while its public body omits database details", async () => {
  const ready = await checkReadiness(async () => undefined);
  const unavailable = await checkReadiness(async () => {
    throw new Error("postgresql://user:database-secret@db.example.test/loyalflow");
  });

  assert.deepEqual(ready, {
    body: { ok: true, service: "loyalflow", status: "ready" },
    status: 200,
  });
  assert.deepEqual(unavailable, {
    body: { ok: false, service: "loyalflow", status: "unavailable" },
    status: 503,
  });

  assert.doesNotMatch(JSON.stringify(unavailable.body), /database|postgres|host/i);
});

test("server error logging redacts connection strings and assigned secrets", () => {
  const message = getSafeErrorMessage(
    new Error(
      "database=postgresql://user:password@db.example.test/loyalflow token=auth-secret-value"
    )
  );

  assert.doesNotMatch(message, /password@db\.example\.test/);
  assert.doesNotMatch(message, /auth-secret-value/);
  assert.match(message, /\[redacted-url\]/);
});

test("health routes expose safe readiness and liveness behavior", () => {
  const readinessRoute = source("app/api/health/route.ts");
  const livenessRoute = source("app/api/health/live/route.ts");

  assert.match(readinessRoute, /checkReadiness/);
  assert.match(readinessRoute, /\$queryRaw`SELECT 1`/);
  assert.doesNotMatch(readinessRoute, /database:\s*["'](connected|disconnected)/);
  assert.match(livenessRoute, /status:\s*["']live["']/);
  assert.doesNotMatch(livenessRoute, /lib\/prisma/);
});

test("deployment configuration retains security headers and safe migration commands", () => {
  const config = source("next.config.ts");
  const packageJson = JSON.parse(source("package.json")) as {
    scripts: Record<string, string>;
  };
  const prismaConfig = source("prisma.config.ts");

  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /X-Frame-Options/);
  assert.match(config, /Referrer-Policy/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /frame-ancestors 'none'/);

  assert.equal(packageJson.scripts["db:migrate:deploy"], "prisma migrate deploy");
  assert.doesNotMatch(packageJson.scripts["db:migrate:deploy"], /migrate dev|db push|migrate reset/);
  assert.doesNotMatch(packageJson.scripts["deploy:check"], /migrate deploy|migrate dev|db push|migrate reset/);
  assert.match(prismaConfig, /SHADOW_DATABASE_URL\?\.trim\(\)/);
  assert.doesNotMatch(prismaConfig, /shadowDatabaseUrl:\s*env\("SHADOW_DATABASE_URL"\)/);
});

test("verification scripts do not print raw error stacks", () => {
  const scriptsDirectory = path.join(root, "scripts");
  const scripts = fs.readdirSync(scriptsDirectory).filter((file) => file.endsWith(".ts"));

  for (const file of scripts) {
    const script = fs.readFileSync(path.join(scriptsDirectory, file), "utf8");

    assert.doesNotMatch(script, /error\.stack/);
  }
});

test("UAT fixtures require but never print their disposable password", () => {
  const uatFixtures = source("scripts/prepare-final-uat-fixtures.ts");

  assert.match(uatFixtures, /process\.env\.UAT_FIXTURE_PASSWORD/);
  assert.doesNotMatch(uatFixtures, /Shared disposable password: \$\{/);
  assert.doesNotMatch(uatFixtures, /const TEST_PASSWORD\s*=/);
});

test("local database verifier requires the complete reviewed committed migration history", () => {
  const verifier = source("scripts/verify-local-database.ts");
  const committedMigrations = fs
    .readdirSync(path.join(root, "prisma/migrations"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.equal(committedMigrations.length, 30);
  assert.match(verifier, /const REVIEWED_MIGRATIONS = \[/);
  assert.doesNotMatch(verifier, /OPTIONAL_REVIEWED_MIGRATIONS/);
  assert.match(
    verifier,
    /JSON\.stringify\(migrationNames\) === JSON\.stringify\(REVIEWED_MIGRATIONS\)/
  );

  for (const migration of committedMigrations) {
    assert.match(verifier, new RegExp(`"${migration}"`));
  }
});

test("final UAT transaction fixtures enforce customer-business consistency", () => {
  const uatFixtures = source("scripts/prepare-final-uat-fixtures.ts");

  assert.match(
    uatFixtures,
    /assert\.equal\(\s*input\.customer\.businessId,\s*input\.businessId/
  );
  assert.match(
    uatFixtures,
    /const salesCustomer = await createCustomer\(\{\s*businessId: businessSales\.id/
  );
  assert.match(
    uatFixtures,
    /businessId: businessSales\.id, customer: salesCustomer, amount: 100/
  );
});
