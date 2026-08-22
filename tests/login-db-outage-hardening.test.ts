import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { isLoginDatabaseUnavailableError } from "@/lib/auth/login-dependency-error";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("login DB outage classifier accepts only bounded availability failures", () => {
  for (const code of [
    "P1001",
    "P1002",
    "P1008",
    "P1017",
    "P2024",
    "P2037",
    "P2039",
  ]) {
    assert.equal(isLoginDatabaseUnavailableError({ code }), true, code);
  }

  assert.equal(isLoginDatabaseUnavailableError({ code: "P2002" }), false);
  assert.equal(isLoginDatabaseUnavailableError(new Error("unknown")), false);
});

test("login DB outage classifier follows bounded Auth.js cause wrappers", () => {
  assert.equal(
    isLoginDatabaseUnavailableError({
      cause: { err: { code: "P2039" } },
    }),
    true,
  );

  const cycle: { cause?: unknown } = {};
  cycle.cause = cycle;
  assert.equal(isLoginDatabaseUnavailableError(cycle), false);
});

test("login action returns a neutral outage state while unknown failures still throw", () => {
  const action = source("app/login/actions.ts");
  const form = source("app/login/login-form.tsx");

  assert.match(action, /isLoginDatabaseUnavailableError\(error\)/);
  assert.match(action, /return \{ status: "service-unavailable" \}/);
  assert.match(action, /throw error;/);
  assert.match(form, /state\.status === "service-unavailable"/);
  assert.match(form, /data-testid="login-service-unavailable"/);
});

test("login outage copy is sourced bilingually from the auth catalog", () => {
  const catalogs = [
    source("packages/i18n/src/locales/en/auth.ts"),
    source("packages/i18n/src/locales/ar/auth.ts"),
  ];

  for (const catalog of catalogs) {
    assert.match(catalog, /"auth\.serviceUnavailable"/);
  }
});
