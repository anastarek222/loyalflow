import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function action(sourceText: string, name: string, nextName: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  const end = sourceText.indexOf(`export async function ${nextName}`, start);
  assert.ok(start >= 0 && end > start, `${name} must have a bounded source slice`);
  return sourceText.slice(start, end);
}

const settingsActions = source("app/businesses/[slug]/settings/actions.ts");
const syncAction = action(
  settingsActions,
  "syncGoogleSheetAction",
  "updateBusinessCardDetailsAction",
);

test("TC4.21 guards manual Google Sheets sync as OPERATE", () => {
  assert.match(syncAction, /subscriptionLifecycleState: true/);
  assert.match(syncAction, /canPerformSubscriptionOperation\(/);
  assert.match(syncAction, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(syncAction, /"OPERATE"/);
  assert.match(syncAction, /sheetSync=subscription-restricted/);
  assert.ok(
    syncAction.indexOf("await canBusinessPerformSubscriptionOperation") <
      syncAction.indexOf("await syncBusinessToGoogleSheetSafely"),
  );
});

test("TC4.21 preserves authorization without provider configuration changes", () => {
  assert.match(syncAction, /canManageBusiness/);
  assert.doesNotMatch(syncAction, /process\.env|GOOGLE_PRIVATE_KEY|GOOGLE_SERVICE_ACCOUNT_EMAIL/);
  assert.doesNotMatch(syncAction, /create|update|delete|upsert/);
});

test("TC4.21 exposes bounded bilingual restriction feedback", () => {
  const page = source("app/businesses/[slug]/settings/page.tsx");
  assert.match(page, /query\.sheetSync === "subscription-restricted"/);
  assert.match(page, /current subscription state/);
  assert.match(page, /حالة الاشتراك الحالية/);
});
