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
const uploadAction = action(
  settingsActions,
  "uploadCustomCardArtworkAction",
  "publishCustomCardArtworkAction",
);
const publishAction = action(
  settingsActions,
  "publishCustomCardArtworkAction",
  "syncGoogleSheetAction",
);

test("TC4.20 guards immutable Custom Card draft expansion", () => {
  assert.match(uploadAction, /subscriptionLifecycleState: true/);
  assert.match(uploadAction, /canPerformSubscriptionOperation\(/);
  assert.match(uploadAction, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(uploadAction, /"EXPAND"/);
  assert.match(uploadAction, /cardDesign=subscription-restricted/);
  assert.ok(
    uploadAction.indexOf("await canBusinessPerformSubscriptionOperation") <
      uploadAction.indexOf("await uploadCustomCardArtwork"),
  );
});

test("TC4.20 guards Custom Card publish as OPERATE inside its transaction", () => {
  assert.match(publishAction, /subscriptionLifecycleState: true/);
  assert.match(publishAction, /canPerformSubscriptionOperation\(/);
  assert.match(publishAction, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(publishAction, /"OPERATE"/);
  assert.ok(
    publishAction.indexOf("await canBusinessPerformSubscriptionOperation") <
      publishAction.indexOf("await transaction.business.update"),
  );
});

test("TC4.20 preserves Super Admin, version, and bilingual boundaries", () => {
  assert.match(uploadAction, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(publishAction, /findCustomCardArtworkVersion\(business\.id, version\)/);
  assert.match(publishAction, /customCardSafeZoneVersion: "ID1_V1"/);
  assert.doesNotMatch(`${uploadAction}\n${publishAction}`, /delete|overwrite/i);
  const page = source("app/businesses/[slug]/program/page.tsx");
  assert.match(page, /query\.cardDesign === "subscription-restricted"/);
  assert.match(page, /current subscription state/);
  assert.match(page, /حالة الاشتراك الحالية/);
});
