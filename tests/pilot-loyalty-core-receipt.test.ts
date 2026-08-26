import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Pilot loyalty receipt keeps the existing end-to-end Customer operations", () => {
  const browser = source("tests/browser/final-uat-u13.spec.ts");

  assert.match(
    browser,
    /authentication, owner navigation, reports, and exact-once Scan earn\/redeem/,
  );
  assert.match(browser, /\/rewards/);
  assert.match(browser, /\["offers", "campaigns", "recovery"\]/);
  assert.match(browser, /name: "Record visit", exact: true/);
  assert.match(browser, /success=earned/);
  assert.match(browser, /name: "Redeem reward", exact: true/);
  assert.match(browser, /success=redeemed/);
  assert.match(
    browser,
    /manager and viewer remain within their authoritative capabilities/,
  );
});

test("Pilot loyalty receipt runs conditionally for relevant product slices", () => {
  const workflow = source(".github/workflows/staging-pr-validation.yml");

  assert.match(workflow, /echo "loyalty-core=true"/);
  assert.match(workflow, /steps\.browser-smoke\.outputs\.loyalty-core/);
  assert.match(workflow, /tests\/browser\/final-uat-u13\.spec\.ts/);
  assert.match(workflow, /--project=desktop-chromium/);
  assert.match(
    workflow,
    /app\/businesses\/\\\[slug\\\]\/\(scan\|customers\|rewards\|offers/,
  );
});

test("Pilot mobile loyalty receipt keeps Staff and public Customer journeys", () => {
  const browser = source("tests/browser/final-uat-u13.spec.ts");

  assert.match(browser, /staff operates Scan in Arabic on mobile/);
  assert.match(browser, /public enrollment and English\/Arabic public cards/);
  assert.match(browser, /name: "Add to Home Screen", exact: true/);
  assert.match(browser, /Private final UAT fixture note/);
  assert.match(browser, /\/join\/\$\{fixture\.businessA\}/);
  assert.match(browser, /\/card\/\$\{fixture\.activeCustomer\.publicToken\}/);
});

test("Pilot mobile loyalty receipt runs only for relevant mobile slices", () => {
  const workflow = source(".github/workflows/staging-pr-validation.yml");

  assert.match(workflow, /echo "loyalty-mobile=true"/);
  assert.match(workflow, /steps\.browser-smoke\.outputs\.loyalty-mobile/);
  assert.match(workflow, /--project=mobile-chromium/);
  assert.match(workflow, /app\/\(join\|card\)\//);
});
