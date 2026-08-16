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
const cardDetailsAction = action(
  actions,
  "updateBusinessCardDetailsAction",
  "updateBusinessExportPermissionAction",
);
const command = source("lib/server/business/business-card-details-command.ts");
const sharedSettingsCommand = source("lib/server/business/settings-command.ts");

test("TC5 Card details extraction preserves active action until bounded wiring", () => {
  assert.match(cardDetailsAction, /cardBusinessDetailsSchema\.safeParse/);
  assert.match(cardDetailsAction, /canPerformSubscriptionOperation/);
  assert.match(cardDetailsAction, /canBusinessPerformSubscriptionOperation/);
  assert.match(cardDetailsAction, /prisma\.\$transaction/);
  assert.match(cardDetailsAction, /transaction\.business\.update/);
  assert.match(cardDetailsAction, /BUSINESS_SETTINGS_UPDATED/);
  assert.doesNotMatch(cardDetailsAction, /updateBusinessCardDetailsCommand/);
});

test("TC5 Card details semantic command delegates the exact payload to shared persisted settings authority", () => {
  assert.match(command, /updateBusinessSettingsCommand/);
  assert.match(command, /businessId: input\.businessId/);
  assert.match(command, /user: input\.actor/);
  assert.match(command, /contactPhone: input\.contactPhone/);
  assert.match(command, /address: input\.address/);
  assert.match(command, /cardTerms: input\.cardTerms/);
  assert.match(command, /enforceOperateEntitlement: true/);
  assert.match(command, /تم تحديث بيانات التواصل وشروط الكارت الرقمي/);
});

test("TC5 Shared settings authority keeps persisted OPERATE enforcement and atomic business audit", () => {
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

test("TC5 Card details command remains provider, environment and schema neutral", () => {
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
  assert.doesNotMatch(command, /prisma|generated\/prisma/i);
});
