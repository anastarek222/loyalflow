import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const browser = source("tests/browser/pre-final-admin-security.spec.ts");
const artworkCleanup = source("scripts/cleanup-final-uat-card-artwork.ts");

test("pre-final browser matrix covers administration, customer, notifications, session security, and Custom Card lifecycle surfaces", () => {
  for (const marker of [
    "/settings",
    "/program",
    "/branches",
    "/users",
    "/customers/${fixture.activeCustomer.id}",
    "?notifications=1",
    "/account/security",
    "Log out everywhere",
    "Front artwork",
    "Back artwork",
    "Upload new draft version",
    "cardDesign=invalid",
    "cardDesign=draft&customVersion=",
    "Publish this version",
    "cardDesign=published",
    'getByTestId("custom-card-front")',
    'getByTestId("custom-card-back")',
    'getByTestId("loyalty-card-flip")',
    'name: "Back"',
    'name: "Flip card"',
  ]) {
    assert.ok(browser.includes(marker), `missing browser proof marker: ${marker}`);
  }
});

test("pre-final browser matrix preserves disposable fixture lifecycle and unexpected-error gate", () => {
  assert.match(browser, /prepareBrowserUat/);
  assert.match(browser, /cleanupCustomCardArtwork\(fixture\.runId\)/);
  assert.match(browser, /cleanupBrowserUat\(fixture\.runId, manifestPath\)/);
  assert.match(browser, /pageerror/);
  assert.match(browser, /message\.type\(\) === "error"/);
  assert.match(browser, /preFinalErrors/);
  assert.match(browser, /solidPng\(856, 540/);
  assert.match(browser, /solidPng\(640, 480/);
});

test("Custom Card UAT cleanup is strictly synthetic, environment-guarded, and prefix-bounded", () => {
  assert.match(artworkCleanup, /assertDatabaseScriptEnvironment/);
  assert.match(artworkCleanup, /LOYALFLOW_ENVIRONMENT === "staging"/);
  assert.match(artworkCleanup, /LOYALFLOW_STAGING_DATABASE/);
  assert.match(artworkCleanup, /const PREFIX = "lf-uat-final-"/);
  assert.match(artworkCleanup, /startsWith: PREFIX/);
  assert.match(artworkCleanup, /endsWith: `-\$\{runId\}`/);
  assert.match(artworkCleanup, /const prefix = `custom-card\/\$\{businessId\}\//);
  assert.match(artworkCleanup, /blob\.pathname\.startsWith\(prefix\)/);
  assert.match(artworkCleanup, /await del\(urls\)/);
  assert.doesNotMatch(artworkCleanup, /--prod|production.*delete|reset:production-data/);
});

test("valid Custom Card mutation runs only when the UAT runner can clean immutable Blob artifacts", () => {
  assert.match(browser, /canCleanUploadedBlobArtwork\(\)/);
  assert.match(browser, /BLOB_READ_WRITE_TOKEN \|\| process\.env\.BLOB_STORE_ID/);
  assert.match(browser, /if \(!canCleanUploadedBlobArtwork\(\)\)/);
  assert.match(browser, /valid upload\/publish is intentionally not mutated/);
});
