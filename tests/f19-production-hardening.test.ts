import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  EnvironmentValidationError,
  validateProductionEnvironment,
  validateRuntimeEnvironment,
} from "@/lib/server/environment";
import { getPublicReleaseMetadata } from "@/lib/server/release";

const root = process.cwd();

function source(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function productionEnvironment(
  overrides: Record<string, string | undefined> = {},
) {
  return {
    NODE_ENV: "production",
    DATABASE_URL:
      "postgresql://user:secret@db.example.test/loyalflow?sslmode=verify-full",
    AUTH_SECRET: "safe-test-secret",
    NEXT_PUBLIC_APP_URL: "https://app.example.test",
    LOYALFLOW_ENVIRONMENT: "production",
    LOYALFLOW_PRODUCTION_DATABASE: "loyalflow",
    LOYALFLOW_RELEASE_SHA: "8c0362c",
    ...overrides,
  };
}

test("F19.4 production runtime requires explicit production identity", () => {
  assert.throws(
    () =>
      validateProductionEnvironment(
        productionEnvironment({ LOYALFLOW_ENVIRONMENT: "staging" }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof EnvironmentValidationError);
      assert.match(error.message, /LOYALFLOW_ENVIRONMENT/);
      return true;
    },
  );

  assert.throws(
    () =>
      validateProductionEnvironment(
        productionEnvironment({ LOYALFLOW_PRODUCTION_DATABASE: undefined }),
      ),
    /LOYALFLOW_PRODUCTION_DATABASE/,
  );
});

test("F19.4 validates release SHAs without exposing arbitrary metadata", () => {
  assert.equal(
    validateRuntimeEnvironment(productionEnvironment()).releaseSha,
    "8c0362c",
  );

  assert.throws(
    () =>
      validateRuntimeEnvironment(
        productionEnvironment({ LOYALFLOW_RELEASE_SHA: "not-a-sha!" }),
      ),
    /LOYALFLOW_RELEASE_SHA/,
  );
});

test("F19.4 public release metadata is bounded and secret-free", () => {
  assert.deepEqual(
    getPublicReleaseMetadata({
      NODE_ENV: "production",
      LOYALFLOW_ENVIRONMENT: "production",
      LOYALFLOW_RELEASE_SHA: "8c0362cabcdef1234567890",
      DATABASE_URL: "postgresql://secret@host/private",
      AUTH_SECRET: "never-expose-this",
    }),
    {
      environment: "production",
      release: "8c0362cabcde",
    },
  );
});

test("F19.4 health routes expose only safe release identity", () => {
  const live = source("app/api/health/live/route.ts");
  const ready = source("app/api/health/route.ts");

  assert.match(live, /getPublicReleaseMetadata/);
  assert.match(ready, /getPublicReleaseMetadata/);
  assert.doesNotMatch(live, /DATABASE_URL|AUTH_SECRET/);
  assert.doesNotMatch(ready, /DATABASE_URL|AUTH_SECRET/);
});

test("F19.4 production DB guard requires exact identity and rejects non-production-looking names", () => {
  const guard = source("scripts/verify-production-database-target.ts");

  assert.match(guard, /SELECT current_database\(\) AS database/);
  assert.match(guard, /LOYALFLOW_PRODUCTION_DATABASE/);
  assert.match(guard, /actualDatabase !== expectedDatabase/);
  assert.match(guard, /test\|dev\|development\|local\|staging/);
  assert.doesNotMatch(guard, /console\.log\([^)]*DATABASE_URL/);
});

test("F19.4 remote smoke checks only public health endpoints over HTTPS", () => {
  const smoke = source("scripts/verify-production-smoke.ts");

  assert.match(smoke, /url\.protocol !== "https:"/);
  assert.match(smoke, /\/api\/health\/live/);
  assert.match(smoke, /\/api\/health/);
  assert.match(smoke, /AbortSignal\.timeout\(10_000\)/);
  assert.doesNotMatch(smoke, /AUTH_SECRET|DATABASE_URL/);
});

test("F19.4 production preflight remains read-only", () => {
  const packageJson = JSON.parse(source("package.json")) as {
    scripts: Record<string, string>;
  };

  const preflight = packageJson.scripts["release:production-preflight"];
  assert.match(preflight, /verify:production/);
  assert.match(preflight, /verify:production-db/);
  assert.match(preflight, /db:migrate:status/);
  assert.doesNotMatch(
    preflight,
    /migrate deploy|migrate dev|db push|migrate reset/,
  );
});

test("F19.4 adds stronger production transport and browser isolation headers", () => {
  const config = source("next.config.ts");

  assert.match(config, /Strict-Transport-Security/);
  assert.match(config, /Cross-Origin-Opener-Policy/);
  assert.match(config, /X-DNS-Prefetch-Control/);
  assert.match(config, /NODE_ENV === "production"/);
});

test("F19.4 release checklist preserves explicit rollback and migration safety", () => {
  const checklist = source("F19_PRODUCTION_RELEASE_CHECKLIST.md");

  assert.match(checklist, /release:production-preflight/);
  assert.match(checklist, /verify:production-db/);
  assert.match(checklist, /verify:production-smoke/);
  assert.match(checklist, /migrate dev/);
  assert.match(checklist, /db push/);
  assert.match(checklist, /migrate reset/);
  assert.match(checklist, /Rollback/i);
});
