import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Pilot receipt completes pending Owner launch and direct re-entry", () => {
  const browser = source("tests/browser/owner-onboarding-mobile.spec.ts");

  assert.match(browser, /LoyalFlow final UAT O \$\{fixture\.runId\}/);
  assert.match(browser, /for \(const step of \[3, 4, 5, 6\]\)/);
  assert.match(browser, /name: "Launch", exact: true/);
  assert.match(browser, /name: "Log out", exact: true/);
  assert.match(browser, /uatEmail\("pending-owner", fixture\.runId\)/);
  assert.match(browser, /new RegExp\(`\/businesses\/\$\{businessSlug\}\$`\)/);
});

test("Pilot receipt stays isolated and cleanup owns the launched Business", () => {
  const browser = source("tests/browser/owner-onboarding-mobile.spec.ts");
  const fixtures = source("scripts/prepare-final-uat-fixtures.ts");

  assert.match(
    browser,
    /if \(process\.env\.STAGING_UAT_MANIFEST_PATH\?\.trim\(\)\) return/,
  );
  assert.match(fixtures, /"pending-owner"/);
  assert.match(fixtures, /function ownerOnboardingBusiness\(run: string\)/);
  assert.match(fixtures, /slug: `loyalflow-final-uat-o-\$\{run\}`/);
  assert.match(fixtures, /\{ slug: ownerOnboardingBusiness\(run\)\.slug \}/);
});

test("Owner onboarding browser receipt runs only for relevant PR slices", () => {
  const workflow = source(".github/workflows/staging-pr-validation.yml");

  assert.match(workflow, /echo "owner-onboarding=true"/);
  assert.match(workflow, /steps\.browser-smoke\.outputs\.owner-onboarding/);
  assert.match(workflow, /tests\/browser\/owner-onboarding-mobile\.spec\.ts/);
  assert.match(workflow, /--project=owner-onboarding-chromium/);
});
