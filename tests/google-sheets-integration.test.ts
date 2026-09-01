import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getGoogleSheetsConfiguration, normalizeGooglePrivateKey } from "@/lib/google-sheets";
import { planLegacyGoogleSheetClaim } from "@/lib/google-sheets-legacy";
import { getUniqueGoogleSheetTitle, sanitizeGoogleSheetTitle } from "@/lib/google-sheets-title";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");
const privateKey = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----";

test("Google Sheets uses complete server-only environment credentials and normalizes escaped newlines", () => {
  const configuration = getGoogleSheetsConfiguration({
    GOOGLE_SPREADSHEET_ID: "spreadsheet-id",
    GOOGLE_SERVICE_ACCOUNT_EMAIL: "service@example.iam.gserviceaccount.com",
    GOOGLE_PRIVATE_KEY: privateKey,
  });
  assert.equal(configuration.configured, true);
  if (configuration.configured) assert.match(configuration.credentials.private_key, /\nabc\n/);
  assert.equal(normalizeGooglePrivateKey(privateKey), "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----");
});
test("Google Sheets distinguishes incomplete and malformed credentials without returning secrets", () => {
  assert.deepEqual(getGoogleSheetsConfiguration({}), { configured: false, reason: "MISSING_SPREADSHEET_ID" });
  assert.deepEqual(getGoogleSheetsConfiguration({ GOOGLE_SPREADSHEET_ID: "id" }), { configured: false, reason: "MISSING_SERVICE_ACCOUNT_EMAIL" });
  assert.deepEqual(getGoogleSheetsConfiguration({ GOOGLE_SPREADSHEET_ID: "id", GOOGLE_SERVICE_ACCOUNT_EMAIL: "service@example.com" }), { configured: false, reason: "MISSING_PRIVATE_KEY" });
  assert.deepEqual(getGoogleSheetsConfiguration({ GOOGLE_SPREADSHEET_ID: "id", GOOGLE_SERVICE_ACCOUNT_EMAIL: "bad", GOOGLE_PRIVATE_KEY: "not-a-key" }), { configured: false, reason: "MALFORMED_CREDENTIAL" });
});

test("new mappings derive unique titles and never auto-claim an existing legacy tab", () => {
  assert.equal(sanitizeGoogleSheetTitle("  SERA[]  ", "sera"), "SERA");
  assert.equal(getUniqueGoogleSheetTitle("SERA", ["SERA", "SERA (2)"]), "SERA (3)");
  assert.deepEqual(planLegacyGoogleSheetClaim({ currentGoogleSheetId: null, selectedSheetId: 7, availableSheets: [{ sheetId: 7, title: "SERA" }], confirmation: undefined }), { allowed: false, reason: "CONFIRMATION_REQUIRED" });
  assert.deepEqual(planLegacyGoogleSheetClaim({ currentGoogleSheetId: null, selectedSheetId: 7, availableSheets: [{ sheetId: 7, title: "SERA" }], confirmation: "CLAIM_LEGACY_GOOGLE_SHEET" }), { allowed: true, sheetId: 7, title: "SERA" });
});

test("sync has stable sheet mapping, records retryable failures, and cannot select a tab by name", () => {
  const sync = source("lib/google-sheets-sync.ts");
  const safeSync = source("lib/google-sheets-sync-safe.ts");
  const creation = source("app/businesses/actions.ts");
  const sheetsScheduler = source("lib/google-sheets-sync-scheduler.ts");
  const scheduler = source("lib/integration-job-scheduler.ts");
  assert.match(sync, /googleSheetId !== null/);
  assert.match(sync, /sheetId === business\.googleSheetId/);
  assert.match(sync, /A missing mapping deliberately never claims a same-named legacy tab/);
  assert.match(sync, /values\.clear/);
  assert.match(sync, /verified, mapped tab/);
  assert.match(safeSync, /googleSheetsSyncState: "FAILED"/);
  assert.match(safeSync, /googleSheetsRetryable: retryable/);
  assert.match(creation, /scheduleBusinessGoogleSheetsSync\(integrationJobId\)/);
  assert.match(sheetsScheduler, /scheduleIntegrationJob\(jobId\)/);
  assert.match(scheduler, /await publishIntegrationJob\(\{ jobId \}\)/);
  assert.doesNotMatch(scheduler, /syncBusinessToGoogleSheetSafely/);
});
