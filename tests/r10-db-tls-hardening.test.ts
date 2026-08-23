import assert from "node:assert/strict";
import test from "node:test";

import {
  EnvironmentValidationError,
  validateRuntimeEnvironment,
} from "@/lib/server/environment";

function productionLikeEnvironment(
  environmentName: "preview" | "staging" | "production",
  databaseUrl: string,
) {
  return {
    NODE_ENV: "production",
    DATABASE_URL: databaseUrl,
    AUTH_SECRET: "safe-test-secret",
    NEXT_PUBLIC_APP_URL: `https://${environmentName}.loyalflow.co`,
    LOYALFLOW_ENVIRONMENT: environmentName,
    LOYALFLOW_RELEASE_SHA: "c5c5436ab827",
  };
}

test("R10 production-like runtimes accept only encrypted PostgreSQL sslmodes", () => {
  const allowedSslModes = ["require", "verify-ca", "verify-full"] as const;

  for (const environmentName of ["preview", "staging", "production"] as const) {
    for (const sslmode of allowedSslModes) {
      assert.doesNotThrow(() =>
        validateRuntimeEnvironment(
          productionLikeEnvironment(
            environmentName,
            `postgresql://user:secret@db.example.test/loyalflow?sslmode=${sslmode}`,
          ),
        ),
      );
    }
  }
});

test("R10 production-like runtimes reject missing, insecure, malformed, duplicate, and unknown sslmodes", () => {
  const rejectedDatabaseUrls = [
    "postgresql://user:secret@db.example.test/loyalflow",
    "postgresql://user:secret@db.example.test/loyalflow?sslmode=disable",
    "postgresql://user:secret@db.example.test/loyalflow?sslmode=allow",
    "postgresql://user:secret@db.example.test/loyalflow?sslmode=prefer",
    "postgresql://user:secret@db.example.test/loyalflow?sslmode=unexpected",
    "not-a-database-url?sslmode=require",
    "postgresql://user:secret@db.example.test/loyalflow?sslmode=require&sslmode=disable",
  ];

  for (const environmentName of ["preview", "staging", "production"] as const) {
    for (const databaseUrl of rejectedDatabaseUrls) {
      assert.throws(
        () =>
          validateRuntimeEnvironment(
            productionLikeEnvironment(environmentName, databaseUrl),
          ),
        (error: unknown) => {
          assert.ok(error instanceof EnvironmentValidationError);
          assert.match(error.message, /DATABASE_URL/);
          assert.match(error.message, /sslmode/);
          return true;
        },
      );
    }
  }
});

test("R10 database TLS validation never exposes database credentials or the raw URL", () => {
  const databaseUrl =
    "postgresql://private-user:super-secret-password@db.example.test/loyalflow?sslmode=disable";

  assert.throws(
    () =>
      validateRuntimeEnvironment(
        productionLikeEnvironment("production", databaseUrl),
      ),
    (error: unknown) => {
      assert.ok(error instanceof EnvironmentValidationError);
      assert.doesNotMatch(error.message, /private-user/);
      assert.doesNotMatch(error.message, /super-secret-password/);
      assert.doesNotMatch(error.message, /db\.example\.test/);
      assert.doesNotMatch(error.message, new RegExp(databaseUrl));
      return true;
    },
  );
});

test("R10 local and CI runtime database URL behavior remains unchanged", () => {
  assert.doesNotThrow(() =>
    validateRuntimeEnvironment({
      NODE_ENV: "development",
      LOYALFLOW_ENVIRONMENT: "development",
      DATABASE_URL: "postgresql://user:secret@localhost:5432/loyalflow",
    }),
  );

  assert.doesNotThrow(() =>
    validateRuntimeEnvironment({
      NODE_ENV: "test",
      LOYALFLOW_ENVIRONMENT: "test",
      DATABASE_URL: "postgresql://user:secret@localhost:5432/loyalflow_test",
    }),
  );

  assert.doesNotThrow(() =>
    validateRuntimeEnvironment({
      CI: "true",
      NODE_ENV: "test",
      LOYALFLOW_ENVIRONMENT: "staging",
      DATABASE_URL: "postgresql://user:secret@127.0.0.1:5432/loyalflow_ci",
    }),
  );
});
