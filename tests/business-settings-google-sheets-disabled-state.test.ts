import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 13 settings disables Google Sheets sync when integration is unconfigured", () => {
  const page = source("app/businesses/[slug]/settings/page.tsx");

  assert.match(page, /const googleSheetsConfiguration = getGoogleSheetsConfiguration\(\);/);
  assert.ok(page.includes("disabled={!googleSheetsConfiguration.configured}"));
  assert.ok(page.includes('aria-describedby="google-sheets-status"'));
  assert.ok(page.includes('id="google-sheets-status"'));
  assert.match(page, /Integration not configured/);
  assert.match(page, /التكامل غير مهيأ/);
  assert.match(page, /disabled:cursor-not-allowed/);
  assert.match(page, /disabled:opacity-50/);
});

test("Stage 13 Google Sheets disabled state preserves sync authority", () => {
  const page = source("app/businesses/[slug]/settings/page.tsx");

  assert.match(page, /const syncGoogleSheet = syncGoogleSheetCommandAction\.bind/);
  assert.match(page, /<form action=\{syncGoogleSheet\}>/);
  assert.match(page, /business\.googleSheetsSyncState === "FAILED"/);
  assert.match(page, /Retry sync/);
  assert.match(page, /Sync Google Sheets/);
});
