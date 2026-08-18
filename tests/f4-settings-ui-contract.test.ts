import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync(
  new URL("../app/businesses/[slug]/settings/page.tsx", import.meta.url),
  "utf8",
);
const settingsForm = readFileSync(
  new URL("../components/business-settings-form.tsx", import.meta.url),
  "utf8",
);

test("Settings uses a direction-safe semantic shell and language-aware integration time", () => {
  assert.match(settingsPage, /dir=\{language === "AR" \? "rtl" : "ltr"\}/);
  assert.match(settingsPage, /const locale = getLanguageLocale\(language\)/);
  assert.match(settingsPage, /toLocaleString\(locale\)/);
  assert.match(settingsPage, /data-settings-administration="true"/);
  assert.match(settingsPage, /data-settings-integrations="true"/);
  assert.match(settingsPage, /hover:bg-primary-hover/);
  assert.match(settingsPage, /role="alert"/);
  assert.match(settingsForm, /bg-surface px-4 py-3 text-foreground/);
  assert.match(settingsForm, /role=\{success \? "status" : "alert"\}/);
  assert.doesNotMatch(settingsForm, /border border-border bg-white p-4/);
});

test("Settings preserves management, integration, export, card, and deletion boundaries", () => {
  assert.match(settingsPage, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(settingsPage, /updateBusinessProfileAction\.bind/);
  assert.match(settingsPage, /updateOperationsSettingsAction\.bind/);
  assert.match(settingsPage, /syncGoogleSheetCommandAction\.bind/);
  assert.match(settingsPage, /updateBusinessCardDetailsAction\.bind/);
  assert.match(settingsPage, /updateBusinessExportPermissionCommandAction\.bind/);
  assert.match(settingsPage, /canDeleteBusiness\(session\.user, business\.id\)/);
  assert.match(settingsPage, /<BusinessDeletionDangerZone/);
  assert.match(settingsPage, /getGoogleSheetsConfiguration\(\)/);
  assert.match(settingsPage, /QRCode\.toDataURL\(joinUrl/);
});
