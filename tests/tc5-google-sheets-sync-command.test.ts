import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const command = source("lib/server/business/google-sheets-sync-command.ts");
const action = source(
  "app/businesses/[slug]/settings/google-sheets-sync-action.ts",
);
const settingsPage = source("app/businesses/[slug]/settings/page.tsx");

test("TC5 Google Sheets sync command rechecks persisted OPERATE before integration side effect", () => {
  const entitlement = command.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const sync = command.indexOf(
    "await syncBusinessToGoogleSheetSafely(input.businessId)",
  );

  assert.ok(entitlement >= 0);
  assert.ok(sync >= 0);
  assert.ok(entitlement < sync);
  assert.match(command, /"OPERATE"/);
  assert.match(command, /businessId: string/);
});

test("TC5 Google Sheets sync command delegates provider and sync-state ownership to the safe helper", () => {
  assert.match(command, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(command, /googleapis|GoogleAuth|process\.env/);
  assert.doesNotMatch(command, /prisma\.business\.update/);
  assert.doesNotMatch(command, /prisma\.\$transaction/);
});

test("TC5 bounded Google Sheets sync action preserves auth, management and feedback contract", () => {
  assert.match(action, /await auth\(\)/);
  assert.match(action, /prisma\.business\.findUnique/);
  assert.match(action, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(action, /canPerformSubscriptionOperation/);
  assert.match(action, /"OPERATE"/);
  assert.match(action, /syncBusinessGoogleSheetCommand/);
  assert.match(action, /sheetSync=subscription-restricted/);
  assert.match(action, /sheetSync=\$\{/);
  assert.match(action, /result\.status === "success" \? "success" : "error"/);
});

test("TC5 bounded Google Sheets sync action owns no provider configuration or direct sync-state persistence", () => {
  assert.doesNotMatch(action, /googleapis|GoogleAuth|process\.env/);
  assert.doesNotMatch(action, /prisma\.business\.update/);
  assert.doesNotMatch(action, /syncBusinessToGoogleSheetSafely/);
});

test("TC5 Settings page actively binds manual Google Sheets sync to the command-backed action", () => {
  assert.match(
    settingsPage,
    /import \{ syncGoogleSheetCommandAction \} from "\.\/google-sheets-sync-action";/,
  );
  assert.match(
    settingsPage,
    /const syncGoogleSheet = syncGoogleSheetCommandAction\.bind\(null, business\.slug\);/,
  );
  assert.match(settingsPage, /<form action=\{syncGoogleSheet\}>/);
  assert.doesNotMatch(settingsPage, /\bsyncGoogleSheetAction\b/);
  assert.match(settingsPage, /updateBusinessProfileAction/);
  assert.match(settingsPage, /updateOperationsSettingsAction/);
  assert.match(settingsPage, /deleteBusinessAction/);
});
