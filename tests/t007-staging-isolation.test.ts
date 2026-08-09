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
    "loyalflow_staging",
  );

  assert.deepEqual(result, {
    required: true,
    allowed: false,
    reason: "missing_expected_database",
  });
});

test("T007 staging isolation rejects production database identity", () => {
  const environment = {
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    LOYALFLOW_STAGING_DATABASE: "loyalflow_staging",
    LOYALFLOW_PRODUCTION_DATABASE: "loyalflow",
  };

  assert.equal(
    evaluateStagingIsolation(environment, "loyalflow").reason,
    "production_database_match",
  );
  assert.equal(evaluateStagingIsolation(environment, "loyalflow").allowed, false);
});

test("T007 staging isolation accepts only the explicitly expected non-production database", () => {
  const environment = {
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    LOYALFLOW_STAGING_DATABASE: "loyalflow_staging",
    LOYALFLOW_PRODUCTION_DATABASE: "loyalflow",
  };

  assert.deepEqual(evaluateStagingIsolation(environment, "loyalflow_staging"), {
    required: true,
    allowed: true,
    reason: "ok",
  });
  assert.equal(
    evaluateStagingIsolation(environment, "other_database").reason,
    "database_mismatch",
  );
});

test("T007 does not impose the staging database contract outside staging", () => {
  assert.deepEqual(
    evaluateStagingIsolation({ LOYALFLOW_ENVIRONMENT: "production", VERCEL_ENV: "production" }, "loyalflow"),
    { required: false, allowed: true, reason: "not_staging" },
  );
});
