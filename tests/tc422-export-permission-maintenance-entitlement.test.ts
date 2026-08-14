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
const exportPermissionAction = action(
  settingsActions,
  "updateBusinessExportPermissionAction",
  "deleteBusinessAction",
);

test("TC4.22 guards export-permission maintenance as OPERATE", () => {
  assert.match(exportPermissionAction, /subscriptionLifecycleState: true/);
  assert.match(exportPermissionAction, /canPerformSubscriptionOperation\(/);
  assert.match(exportPermissionAction, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(exportPermissionAction, /"OPERATE"/);
  assert.match(exportPermissionAction, /exportPermissionSaved=subscription-restricted/);
  assert.ok(
    exportPermissionAction.indexOf("await canBusinessPerformSubscriptionOperation") <
      exportPermissionAction.indexOf("await transaction.business.update"),
  );
});

test("TC4.22 preserves authorization and write-free no-op replay", () => {
  assert.match(exportPermissionAction, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(exportPermissionAction, /allowOwnerDataExport === business\.allowOwnerDataExport/);
  assert.ok(
    exportPermissionAction.indexOf("allowOwnerDataExport === business.allowOwnerDataExport") <
      exportPermissionAction.indexOf("canPerformSubscriptionOperation"),
  );
  assert.match(exportPermissionAction, /transaction\.businessActivity\.create/);
});

test("TC4.22 exposes bounded bilingual restriction feedback", () => {
  const page = source("app/businesses/[slug]/settings/page.tsx");
  assert.match(page, /query\.exportPermissionSaved === "subscription-restricted"/);
  assert.match(page, /current subscription state/);
  assert.match(page, /حالة الاشتراك الحالية/);
});

