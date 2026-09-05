import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Pilot receipt provisions a Business and sign-in-ready Owner through the Super Admin UI", () => {
  const browser = source("tests/browser/owner-onboarding-mobile.spec.ts");
  const fixtures = source("scripts/prepare-final-uat-fixtures.ts");

  assert.match(browser, /uatEmail\("superadmin", fixture\.runId\)/);
  assert.match(browser, /generateTotpCode\(UAT_SUPER_ADMIN_MFA_SECRET\)/);
  assert.match(fixtures, /INSERT INTO "SuperAdminMfa"/);
  assert.match(browser, /page\.goto\("\/businesses\/new"\)/);
  assert.match(browser, /getByPlaceholder\("Business name"\)/);
  assert.match(browser, /LoyalFlow final UAT SA \$\{fixture\.runId\}/);
  assert.match(browser, /uatEmail\("provisioned-owner", fixture\.runId\)/);
  assert.match(browser, /name: "Create business", exact: true/);
  assert.match(browser, /new RegExp\(`\/businesses\/\$\{businessSlug\}\/users/);
  assert.match(browser, /new RegExp\(`\/businesses\/\$\{businessSlug\}\$`\)/);
});

test("Super Admin provisioning receipt is disposable and cleanup owns its exact Owner", () => {
  const browser = source("tests/browser/owner-onboarding-mobile.spec.ts");
  const fixtures = source("scripts/prepare-final-uat-fixtures.ts");

  assert.match(
    browser,
    /Business provisioning requires the disposable PR database/,
  );
  assert.match(fixtures, /"provisioned-owner"/);
  assert.match(fixtures, /startsWith: PREFIX/);
  assert.match(fixtures, /endsWith: `-\$\{run\}`/);
});
