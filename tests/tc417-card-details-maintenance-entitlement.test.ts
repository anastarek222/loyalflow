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
const cardDetailsAction = action(
  settingsActions,
  "updateBusinessCardDetailsAction",
  "updateBusinessExportPermissionAction",
);

test("TC4.17 guards public card details maintenance as OPERATE", () => {
  assert.match(cardDetailsAction, /subscriptionLifecycleState: true/);
  assert.match(cardDetailsAction, /canPerformSubscriptionOperation\(/);
  assert.match(cardDetailsAction, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(cardDetailsAction, /"OPERATE"/);
  assert.match(cardDetailsAction, /cardError=subscription-restricted/);
  assert.ok(
    cardDetailsAction.indexOf("await canBusinessPerformSubscriptionOperation") <
      cardDetailsAction.indexOf("await transaction.business.update"),
  );
});

test("TC4.17 composes with later sync protection while export remains deferred", () => {
  const syncAction = action(
    settingsActions,
    "syncGoogleSheetAction",
    "updateBusinessCardDetailsAction",
  );
  const exportAction = action(
    settingsActions,
    "updateBusinessExportPermissionAction",
    "deleteBusinessAction",
  );
  assert.match(syncAction, /canPerformSubscriptionOperation\(/);
  assert.match(syncAction, /canBusinessPerformSubscriptionOperation\(/);
  assert.doesNotMatch(exportAction, /canPerformSubscriptionOperation\(/);
  assert.doesNotMatch(exportAction, /canBusinessPerformSubscriptionOperation\(/);
});

test("TC4.17 exposes bounded bilingual restriction feedback", () => {
  const settingsPage = source("app/businesses/[slug]/settings/page.tsx");
  assert.match(settingsPage, /query\.cardError === "subscription-restricted"/);
  assert.match(settingsPage, /current subscription state/);
  assert.match(settingsPage, /حالة الاشتراك الحالية/);
});
