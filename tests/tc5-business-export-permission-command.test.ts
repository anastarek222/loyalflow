import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function action(sourceText: string, name: string, nextName: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  const end = sourceText.indexOf(`export async function ${nextName}`, start);
  assert.ok(start >= 0 && end > start);
  return sourceText.slice(start, end);
}

const actions = source("app/businesses/[slug]/settings/actions.ts");
const exportAction = action(
  actions,
  "updateBusinessExportPermissionAction",
  "deleteBusinessAction",
);
const command = source(
  "lib/server/business/business-export-permission-command.ts",
);
const sharedSettingsCommand = source("lib/server/business/settings-command.ts");

test("TC5 Export permission extraction preserves SUPER_ADMIN and no-op presentation contract until wiring", () => {
  assert.match(exportAction, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(
    exportAction,
    /allowOwnerDataExport === business\.allowOwnerDataExport/,
  );
  assert.match(exportAction, /canPerformSubscriptionOperation/);
  assert.match(exportAction, /canBusinessPerformSubscriptionOperation/);
  assert.match(exportAction, /prisma\.\$transaction/);
  assert.match(exportAction, /transaction\.business\.update/);
  assert.doesNotMatch(exportAction, /updateBusinessExportPermissionCommand/);
});

test("TC5 Export permission semantic command fixes payload, dynamic audit description and persisted OPERATE delegation", () => {
  assert.match(command, /updateBusinessSettingsCommand/);
  assert.match(command, /businessId: input\.businessId/);
  assert.match(command, /user: input\.actor/);
  assert.match(
    command,
    /allowOwnerDataExport: input\.allowOwnerDataExport/,
  );
  assert.match(command, /enforceOperateEntitlement: true/);
  assert.match(command, /تم السماح لمالك النشاط بتصدير البيانات/);
  assert.match(command, /تم إيقاف صلاحية تصدير البيانات عن مالك النشاط/);
});

test("TC5 Shared settings authority keeps changed export permission mutation and audit atomic behind persisted OPERATE", () => {
  const guard = sharedSettingsCommand.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const update = sharedSettingsCommand.indexOf("transaction.business.update");
  const audit = sharedSettingsCommand.indexOf(
    "transaction.businessActivity.create",
  );
  for (const position of [guard, update, audit]) assert.ok(position >= 0);
  assert.ok(guard < update);
  assert.ok(update < audit);
  assert.match(sharedSettingsCommand, /"OPERATE"/);
  assert.match(sharedSettingsCommand, /BUSINESS_SETTINGS_UPDATED/);
});

test("TC5 Export permission command remains provider, environment and schema neutral", () => {
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
  assert.doesNotMatch(command, /prisma|generated\/prisma/i);
});
