import test from "node:test";
import assert from "node:assert/strict";
import { assertDatabaseScriptEnvironment } from "@/lib/server/database-script-guard";

const baseEnv = {
  LOYALFLOW_ALLOW_DISPOSABLE_DB: "1",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db_test",
  LOYALFLOW_ENVIRONMENT: "test",
  VERCEL_ENV: "", // ensure not ambiguous
  NODE_ENV: "", // ensure not ambiguous
};

test("backup-restore-documentation guard passes with valid opt-in, localhost, and _test database", () => {
  assert.doesNotThrow(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", baseEnv);
  });
});

test("backup-restore-documentation guard passes with 127.0.0.1", () => {
  const env = { ...baseEnv, DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/db_test" };
  assert.doesNotThrow(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", env);
  });
});

test("fails when LOYALFLOW_ALLOW_DISPOSABLE_DB is missing or not '1'", () => {
  const base = { DATABASE_URL: "postgresql://user:pass@localhost:5432/db_test", LOYALFLOW_ENVIRONMENT: "test", VERCEL_ENV: "", NODE_ENV: "" };
  assert.throws(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", base);
  }, /LOYALFLOW_ALLOW_DISPOSABLE_DB must be set to '1'/);
  const env = { ...base, LOYALFLOW_ALLOW_DISPOSABLE_DB: "0" };
  assert.throws(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", env);
  }, /LOYALFLOW_ALLOW_DISPOSABLE_DB must be set to '1'/);
});

test("fails when DATABASE_URL is missing", () => {
  const env = { LOYALFLOW_ALLOW_DISPOSABLE_DB: "1", LOYALFLOW_ENVIRONMENT: "test", VERCEL_ENV: "", NODE_ENV: "" };
  assert.throws(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", env);
  }, /DATABASE_URL is required/);
});

test("fails when DATABASE_URL is malformed", () => {
  const env = {
    LOYALFLOW_ALLOW_DISPOSABLE_DB: "1",
    DATABASE_URL: "not-a-url",
    LOYALFLOW_ENVIRONMENT: "test",
    VERCEL_ENV: "",
    NODE_ENV: "",
  };
  assert.throws(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", env);
  }, /DATABASE_URL must use postgresql:\/\/ or postgres:\/\/ protocol/);
});

test("fails when host is remote", () => {
  const env = {
    LOYALFLOW_ALLOW_DISPOSABLE_DB: "1",
    DATABASE_URL: "postgresql://user:pass@remotehost:5432/db_test",
    LOYALFLOW_ENVIRONMENT: "test",
    VERCEL_ENV: "",
    NODE_ENV: "",
  };
  assert.throws(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", env);
  }, /Database host must be localhost or 127.0.0.1/);
});

test("fails when database name does not end with _test", () => {
  const env = {
    LOYALFLOW_ALLOW_DISPOSABLE_DB: "1",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db_prod",
    LOYALFLOW_ENVIRONMENT: "test",
    VERCEL_ENV: "",
    NODE_ENV: "",
  };
  assert.throws(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", env);
  }, /Database name must end with '_test'/);
});

test("rejects encoded slash in database name", () => {
  const env = {
    LOYALFLOW_ALLOW_DISPOSABLE_DB: "1",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db%2ftest",
    LOYALFLOW_ENVIRONMENT: "test",
    VERCEL_ENV: "",
    NODE_ENV: "",
  };
  assert.throws(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", env);
  }, /Database name must not contain path segments or encoded characters/);
});

test("rejects extra path segment", () => {
  const env = {
    LOYALFLOW_ALLOW_DISPOSABLE_DB: "1",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db/test",
    LOYALFLOW_ENVIRONMENT: "test",
    VERCEL_ENV: "",
    NODE_ENV: "",
  };
  assert.throws(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", env);
  }, /Database name must not contain path segments or encoded characters/);
});

test("query parameters do not become part of database name", () => {
  const env = {
    LOYALFLOW_ALLOW_DISPOSABLE_DB: "1",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db_test?sslmode=require",
    LOYALFLOW_ENVIRONMENT: "test",
    VERCEL_ENV: "",
    NODE_ENV: "",
  };
  assert.doesNotThrow(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", env);
  });
});

test("rejects a URL fragment", () => {
  const env = {
    ...baseEnv,
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db_test#fragment",
  };

  assert.throws(() => {
    assertDatabaseScriptEnvironment("backup-restore-documentation", env);
  }, /DATABASE_URL must not contain a fragment/);
});

test("existing script classes retain behavior", () => {
  const base = {
    LOYALFLOW_ALLOW_DISPOSABLE_DB: "1",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db_test",
    LOYALFLOW_ENVIRONMENT: "development",
    VERCEL_ENV: "",
    NODE_ENV: "",
  };

  assert.deepEqual(
    assertDatabaseScriptEnvironment("development-migration-generator", base),
    {
      environment: "development",
      deploymentType: "local",
      isProduction: false,
      isPreview: false,
      release: null,
      buildTimestamp: null,
    },
  );

  const prodEnv = { ...base, LOYALFLOW_ENVIRONMENT: "production" };
  assert.throws(() => {
    assertDatabaseScriptEnvironment("seed-fixture", prodEnv);
  }, /Fixture script refused outside development or test/);
});
