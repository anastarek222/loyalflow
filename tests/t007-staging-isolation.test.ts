import assert from "node:assert/strict";
import test from "node:test";

import { getEnvironmentIdentity } from "../lib/server/environment-identity";
import { evaluateStagingIsolation } from "../lib/server/staging-isolation";

test("T007 treats an explicit staging identity on a Vercel Preview host as staging", () => {
  const identity = getEnvironmentIdentity({
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    NODE_ENV: "production",
  });

  assert.equal(identity.environment, "staging");
  assert.equal(identity.deploymentType, "staging");
  assert.equal(identity.isProduction, false);
  assert.equal(identity.isPreview, true);
});

test("T007 refuses a staging identity that conflicts with a Vercel Production host", () => {
  const identity = getEnvironmentIdentity({
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "production",
    NODE_ENV: "production",
  });

  assert.equal(identity.environment, "unknown");
});

test("T007 staging isolation fails closed without an expected staging database identity", () => {
  const result = evaluateStagingIsolation(
    { LOYALFLOW_ENVIRONMENT: "staging", VERCEL_ENV: "preview" },
    "neondb",
  );

  assert.deepEqual(result, {
    required: true,
    allowed: false,
    reason: "missing_expected_database",
  });
});

test("T007 staging isolation fails closed without an expected staging database host", () => {
  const result = evaluateStagingIsolation(
    {
      LOYALFLOW_ENVIRONMENT: "staging",
      VERCEL_ENV: "preview",
      LOYALFLOW_STAGING_DATABASE: "neondb",
    },
    "neondb",
  );

  assert.deepEqual(result, {
    required: true,
    allowed: false,
    reason: "missing_expected_database_host",
  });
});

test("T007 staging isolation rejects the production database host even when database names are identical", () => {
  const environment = {
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    DATABASE_URL: "postgresql://user:secret@prod-db.example.test/neondb?sslmode=require",
    LOYALFLOW_STAGING_DATABASE: "neondb",
    LOYALFLOW_PRODUCTION_DATABASE: "neondb",
    LOYALFLOW_STAGING_DATABASE_HOST: "stage-db.example.test",
    LOYALFLOW_PRODUCTION_DATABASE_HOST: "prod-db.example.test",
  };

  const result = evaluateStagingIsolation(environment, "neondb");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "production_database_host_match");
});

test("T007 staging isolation accepts the expected non-production database host", () => {
  const environment = {
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    DATABASE_URL: "postgresql://user:secret@stage-db.example.test/neondb?sslmode=require",
    LOYALFLOW_STAGING_DATABASE: "neondb",
    LOYALFLOW_PRODUCTION_DATABASE: "neondb",
    LOYALFLOW_STAGING_DATABASE_HOST: "stage-db.example.test",
    LOYALFLOW_PRODUCTION_DATABASE_HOST: "prod-db.example.test",
  };

  assert.deepEqual(evaluateStagingIsolation(environment, "neondb"), {
    required: true,
    allowed: true,
    reason: "ok",
  });
});

test("T007 staging isolation rejects an unexpected database host", () => {
  const environment = {
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    DATABASE_URL: "postgresql://user:secret@other-db.example.test/neondb?sslmode=require",
    LOYALFLOW_STAGING_DATABASE: "neondb",
    LOYALFLOW_PRODUCTION_DATABASE: "neondb",
    LOYALFLOW_STAGING_DATABASE_HOST: "stage-db.example.test",
    LOYALFLOW_PRODUCTION_DATABASE_HOST: "prod-db.example.test",
  };

  const result = evaluateStagingIsolation(environment, "neondb");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "database_host_mismatch");
});

test("T007 staging isolation rejects a database name mismatch", () => {
  const environment = {
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    DATABASE_URL: "postgresql://user:secret@stage-db.example.test/neondb?sslmode=require",
    LOYALFLOW_STAGING_DATABASE: "neondb",
    LOYALFLOW_PRODUCTION_DATABASE: "production_db",
    LOYALFLOW_STAGING_DATABASE_HOST: "stage-db.example.test",
    LOYALFLOW_PRODUCTION_DATABASE_HOST: "prod-db.example.test",
  };

  const result = evaluateStagingIsolation(environment, "other_database");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "database_mismatch");
});

test("T007 staging isolation rejects malformed database URLs", () => {
  const environment = {
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    DATABASE_URL: "not-a-url",
    LOYALFLOW_STAGING_DATABASE: "neondb",
    LOYALFLOW_STAGING_DATABASE_HOST: "stage-db.example.test",
  };

  const result = evaluateStagingIsolation(environment, "neondb");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "invalid_database_url");
});

test("T007 does not impose the staging database contract outside staging", () => {
  assert.deepEqual(
    evaluateStagingIsolation({ LOYALFLOW_ENVIRONMENT: "production", VERCEL_ENV: "production" }, "neondb"),
    { required: false, allowed: true, reason: "not_staging" },
  );
});
