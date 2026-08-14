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
const designAction = action(
  settingsActions,
  "updateBusinessCardDesignAction",
  "uploadCustomCardArtworkAction",
);

test("TC4.19 guards card design maintenance as OPERATE", () => {
  assert.match(designAction, /subscriptionLifecycleState: true/);
  assert.match(designAction, /canPerformSubscriptionOperation\(/);
  assert.match(designAction, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(designAction, /"OPERATE"/);
  assert.match(designAction, /cardDesign=subscription-restricted/);
  assert.ok(
    designAction.indexOf("await canBusinessPerformSubscriptionOperation") <
      designAction.indexOf("await transaction.business.update"),
  );
});

test("TC4.19 preserves card permissions and defers Blob lifecycle actions", () => {
  assert.match(designAction, /getAuthorizedCardDesignUpdate/);
  const customLifecycle = action(
    settingsActions,
    "uploadCustomCardArtworkAction",
    "syncGoogleSheetAction",
  );
  assert.doesNotMatch(customLifecycle, /canPerformSubscriptionOperation\(/);
  assert.doesNotMatch(customLifecycle, /canBusinessPerformSubscriptionOperation\(/);
});

test("TC4.19 exposes bounded bilingual restriction feedback", () => {
  const page = source("app/businesses/[slug]/program/page.tsx");
  assert.match(page, /query\.cardDesign === "subscription-restricted"/);
  assert.match(page, /current subscription state/);
  assert.match(page, /حالة الاشتراك الحالية/);
});
