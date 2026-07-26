import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function source(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("F19 ships a secret-safe production environment template", () => {
  const envExample = source(".env.example");

  assert.match(envExample, /^DATABASE_URL=/m);
  assert.match(envExample, /^AUTH_SECRET=/m);
  assert.match(envExample, /^NEXT_PUBLIC_APP_URL=/m);
  assert.match(envExample, /sslmode=verify-full/);
  assert.doesNotMatch(envExample, /loyalflow_test|neon\.tech/);
  assert.doesNotMatch(envExample, /sk-[A-Za-z0-9_-]{8,}/);
});

test("F19 production verification validates runtime and probes the database", () => {
  const verifier = source("scripts/verify-production-readiness.ts");

  assert.match(verifier, /validateRuntimeEnvironment/);
  assert.match(verifier, /NODE_ENV:\s*"production"/);
  assert.match(verifier, /prisma\.\$queryRaw`SELECT 1`/);
  assert.match(verifier, /sslmode/);
  assert.match(verifier, /prisma\.\$disconnect/);
  assert.doesNotMatch(verifier, /password|AUTH_SECRET.*console\.log/i);
});

test("F19 release check is read-only with respect to schema changes", () => {
  const packageJson = JSON.parse(source("package.json")) as {
    scripts: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts["verify:production"],
    "tsx scripts/verify-production-readiness.ts",
  );

  assert.match(packageJson.scripts["release:check"], /db:validate/);
  assert.match(packageJson.scripts["release:check"], /db:migrate:status/);
  assert.match(packageJson.scripts["release:check"], /typecheck/);
  assert.match(packageJson.scripts["release:check"], /lint/);
  assert.match(packageJson.scripts["release:check"], /pnpm test/);
  assert.match(packageJson.scripts["release:check"], /build/);

  assert.doesNotMatch(
    packageJson.scripts["release:check"],
    /migrate deploy|migrate dev|db push|migrate reset/,
  );
});

test("F19 runbook documents an explicit production migration and rollback policy", () => {
  const runbook = source("F19_PRODUCTION_DEPLOYMENT_RUNBOOK.md");

  assert.match(runbook, /prisma migrate deploy/);
  assert.match(runbook, /prisma migrate dev/);
  assert.match(runbook, /prisma db push/);
  assert.match(runbook, /prisma migrate reset/);
  assert.match(runbook, /rollback/i);
  assert.match(runbook, /\/api\/health\/live/);
  assert.match(runbook, /\/api\/health/);
});
