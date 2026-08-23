import assert from "node:assert/strict";
import test from "node:test";

import { assertDatabaseScriptEnvironment } from "@/lib/server/database-script-guard";
import { getEnvironmentIdentity } from "@/lib/server/environment-identity";
import { getCanonicalPublicAppUrl } from "@/lib/public-app-url";

test("environment identity resolves the five supported environments without secrets", () => {
  for (const environment of ["development", "test", "preview", "staging", "production"] as const) {
    const identity = getEnvironmentIdentity({ LOYALFLOW_ENVIRONMENT: environment, LOYALFLOW_RELEASE_SHA: "abcdef123456" });
    assert.equal(identity.environment, environment);
    assert.equal(identity.release, "abcdef123456");
    assert.equal(JSON.stringify(identity).includes("DATABASE_URL"), false);
  }
  assert.equal(getEnvironmentIdentity({}).environment, "unknown");
  assert.equal(getEnvironmentIdentity({ LOYALFLOW_ENVIRONMENT: "preview", VERCEL_ENV: "production", NODE_ENV: "production" }).environment, "unknown");
});

test("database mutation guard fails closed and never includes a secret", () => {
  assert.doesNotThrow(() => assertDatabaseScriptEnvironment("destructive-reset", { LOYALFLOW_ENVIRONMENT: "development" }));
  assert.doesNotThrow(() => assertDatabaseScriptEnvironment("seed-fixture", { LOYALFLOW_ENVIRONMENT: "test" }));
  for (const environment of ["preview", "staging", "production"] as const) {
    assert.throws(() => assertDatabaseScriptEnvironment("destructive-reset", { LOYALFLOW_ENVIRONMENT: environment, DATABASE_URL: "postgresql://secret@host/db" }), /refused/);
  }
  assert.doesNotThrow(() => assertDatabaseScriptEnvironment("destructive-reset", { LOYALFLOW_ENVIRONMENT: "production", LOYALFLOW_ALLOW_PRODUCTION_MUTATION: "I_UNDERSTAND_PRODUCTION_MUTATION" }));
  assert.throws(() => assertDatabaseScriptEnvironment("controlled-operation", { LOYALFLOW_ENVIRONMENT: "production" }), /explicit override/);
  assert.doesNotThrow(() => assertDatabaseScriptEnvironment("controlled-operation", { LOYALFLOW_ENVIRONMENT: "production", LOYALFLOW_ALLOW_PRODUCTION_MUTATION: "I_UNDERSTAND_PRODUCTION_MUTATION" }));
  assert.throws(() => assertDatabaseScriptEnvironment("destructive-reset", { DATABASE_URL: "postgresql://secret@host/db" }), (error: unknown) => { assert.doesNotMatch(String(error), /secret@host/); return true; });
  assert.throws(() => assertDatabaseScriptEnvironment("destructive-reset", { LOYALFLOW_ENVIRONMENT: "preview", VERCEL_ENV: "production", NODE_ENV: "production" }), /ambiguous/);
});

test("staging fixture mutation requires explicit opt-in and an isolated host", () => {
  const stagingFixtureEnvironment = {
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    DATABASE_URL: "postgresql://user:secret@ep-staging-pooler.example.test/neondb?sslmode=require",
    LOYALFLOW_STAGING_DATABASE_HOST: "ep-staging.example.test",
    LOYALFLOW_PRODUCTION_DATABASE_HOST: "ep-production.example.test",
    LOYALFLOW_ALLOW_STAGING_FIXTURE: "I_UNDERSTAND_STAGING_FIXTURE",
  };

  assert.doesNotThrow(() => assertDatabaseScriptEnvironment("staging-seed-fixture", stagingFixtureEnvironment));
  assert.throws(() => assertDatabaseScriptEnvironment("staging-seed-fixture", { ...stagingFixtureEnvironment, LOYALFLOW_ALLOW_STAGING_FIXTURE: undefined }), /explicit opt-in/);
  assert.throws(() => assertDatabaseScriptEnvironment("staging-seed-fixture", { ...stagingFixtureEnvironment, DATABASE_URL: "postgresql://user:secret@ep-production.example.test/neondb?sslmode=require" }), /production_host_match/);
  assert.throws(() => assertDatabaseScriptEnvironment("staging-seed-fixture", { ...stagingFixtureEnvironment, LOYALFLOW_ENVIRONMENT: "production", VERCEL_ENV: "production" }), /outside the isolated staging preview/);
});

test("canonical origins do not use browser hosts or production fallback", () => {
  assert.equal(getCanonicalPublicAppUrl({ LOYALFLOW_ENVIRONMENT: "development" }), "http://localhost:3000");
  assert.equal(getCanonicalPublicAppUrl({ LOYALFLOW_ENVIRONMENT: "preview", NEXT_PUBLIC_APP_URL: "https://preview.loyalflow.co" }), "https://preview.loyalflow.co");
  assert.equal(getCanonicalPublicAppUrl({ LOYALFLOW_ENVIRONMENT: "staging", NEXT_PUBLIC_APP_URL: "https://staging.loyalflow.co" }), "https://staging.loyalflow.co");
  assert.equal(getCanonicalPublicAppUrl({ LOYALFLOW_ENVIRONMENT: "production", NEXT_PUBLIC_APP_URL: "https://app.loyalflow.co" }), "https://app.loyalflow.co");
  assert.throws(() => getCanonicalPublicAppUrl({ LOYALFLOW_ENVIRONMENT: "production" }), /required/);
  assert.throws(() => getCanonicalPublicAppUrl({ LOYALFLOW_ENVIRONMENT: "preview" }), /required/);
});
