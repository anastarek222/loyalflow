import assert from "node:assert/strict";
import test from "node:test";

import { getEnvironmentIdentity } from "../lib/server/environment-identity";
import { evaluateStagingIsolation } from "../lib/server/staging-isolation";

function stagingEnvironment(
  overrides: Record<string, string | undefined> = {},
) {
  return {
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    LOYALFLOW_STAGING_DATABASE_HOST: "ep-staging.example.test",
    LOYALFLOW_PRODUCTION_DATABASE_HOST: "ep-production.example.test",
    ...overrides,
  };
}

function databaseUrl(host: string) {
  return `postgresql://user:secret@${host}/neondb?sslmode=require`;
}

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

test("T007 prefers the Vercel deployment SHA over a stale explicit release", () => {
  const identity = getEnvironmentIdentity({
    LOYALFLOW_RELEASE_SHA: "918f2e72d6da",
    VERCEL_GIT_COMMIT_SHA: "98e54e5262967b691175b05fe749251378631ff5",
  });

  assert.equal(identity.release, "98e54e526296");
});

test("T007 retains the explicit release SHA outside Vercel", () => {
  const identity = getEnvironmentIdentity({
    LOYALFLOW_RELEASE_SHA: "918f2e72d6da",
  });

  assert.equal(identity.release, "918f2e72d6da");
});

test("T007 refuses a staging identity that conflicts with a Vercel Production host", () => {
  const identity = getEnvironmentIdentity({
    LOYALFLOW_ENVIRONMENT: "staging",
    VERCEL_ENV: "production",
    NODE_ENV: "production",
  });

  assert.equal(identity.environment, "unknown");
});

test("T007 staging isolation fails closed without a staging host", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment({ LOYALFLOW_STAGING_DATABASE_HOST: undefined }),
      databaseUrl("ep-staging.example.test"),
    ),
    {
      required: true,
      allowed: false,
      reason: "missing_staging_host",
    },
  );
});

test("T007 staging isolation fails closed with an invalid staging host", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment({ LOYALFLOW_STAGING_DATABASE_HOST: "not a host" }),
      databaseUrl("ep-staging.example.test"),
    ),
    {
      required: true,
      allowed: false,
      reason: "invalid_staging_host",
    },
  );
});

test("T007 staging isolation fails closed without a production host", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment({ LOYALFLOW_PRODUCTION_DATABASE_HOST: undefined }),
      databaseUrl("ep-staging.example.test"),
    ),
    {
      required: true,
      allowed: false,
      reason: "missing_production_host",
    },
  );
});

test("T007 staging isolation fails closed with an invalid production host", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment({ LOYALFLOW_PRODUCTION_DATABASE_HOST: "not a host" }),
      databaseUrl("ep-staging.example.test"),
    ),
    {
      required: true,
      allowed: false,
      reason: "invalid_production_host",
    },
  );
});

test("T007 staging isolation rejects a missing DATABASE_URL", () => {
  assert.deepEqual(evaluateStagingIsolation(stagingEnvironment(), undefined), {
    required: true,
    allowed: false,
    reason: "missing_database_url",
  });
});

test("T007 staging isolation rejects a malformed DATABASE_URL", () => {
  assert.deepEqual(
    evaluateStagingIsolation(stagingEnvironment(), "not a database url"),
    {
      required: true,
      allowed: false,
      reason: "invalid_database_url",
    },
  );
});

test("T007 staging isolation rejects the production endpoint", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment(),
      databaseUrl("ep-production.example.test"),
    ),
    {
      required: true,
      allowed: false,
      reason: "production_host_match",
    },
  );
});

test("T007 staging isolation rejects an unexpected endpoint", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment(),
      databaseUrl("ep-unexpected.example.test"),
    ),
    {
      required: true,
      allowed: false,
      reason: "staging_host_mismatch",
    },
  );
});

test("T007 staging isolation accepts the direct staging endpoint", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment(),
      databaseUrl("ep-staging.example.test"),
    ),
    {
      required: true,
      allowed: true,
      reason: "ok",
    },
  );
});

test("T007 treats an expected pooled endpoint as equivalent to a direct runtime endpoint", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment({
        LOYALFLOW_STAGING_DATABASE_HOST: "ep-staging-pooler.example.test",
      }),
      databaseUrl("ep-staging.example.test"),
    ),
    {
      required: true,
      allowed: true,
      reason: "ok",
    },
  );
});

test("T007 treats an expected direct endpoint as equivalent to a pooled runtime endpoint", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment(),
      databaseUrl("ep-staging-pooler.example.test"),
    ),
    {
      required: true,
      allowed: true,
      reason: "ok",
    },
  );
});

test("T007 normalizes host case and one trailing dot", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment({
        LOYALFLOW_STAGING_DATABASE_HOST: "  EP-STAGING.EXAMPLE.TEST.  ",
        LOYALFLOW_PRODUCTION_DATABASE_HOST: " EP-PRODUCTION.EXAMPLE.TEST. ",
      }),
      databaseUrl("EP-STAGING.EXAMPLE.TEST."),
    ),
    {
      required: true,
      allowed: true,
      reason: "ok",
    },
  );
});

test("T007 rejects equal normalized staging and production host identities", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment({
        LOYALFLOW_STAGING_DATABASE_HOST: "ep-staging-pooler.example.test",
        LOYALFLOW_PRODUCTION_DATABASE_HOST: "EP-STAGING.EXAMPLE.TEST.",
      }),
      databaseUrl("ep-staging.example.test"),
    ),
    {
      required: true,
      allowed: false,
      reason: "staging_production_host_match",
    },
  );
});

test("T007 does not remove pooler from arbitrary first-label positions", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      stagingEnvironment(),
      databaseUrl("ep-staging-pooler-backup.example.test"),
    ),
    {
      required: true,
      allowed: false,
      reason: "staging_host_mismatch",
    },
  );
});

test("T007 does not impose the staging host contract outside staging", () => {
  assert.deepEqual(
    evaluateStagingIsolation(
      { LOYALFLOW_ENVIRONMENT: "production", VERCEL_ENV: "production" },
      "not a database url",
    ),
    { required: false, allowed: true, reason: "not_staging" },
  );
});
