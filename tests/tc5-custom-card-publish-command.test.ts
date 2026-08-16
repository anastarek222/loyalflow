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
const publishAction = action(
  actions,
  "publishCustomCardArtworkAction",
  "syncGoogleSheetAction",
);
const command = source("lib/server/business/custom-card-publish-command.ts");
const sharedSettingsCommand = source("lib/server/business/settings-command.ts");

test("TC5 Custom Card publish extraction preserves authorization, storage lookup and active action until wiring", () => {
  assert.match(publishAction, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(publishAction, /canManageBusiness/);
  assert.match(publishAction, /canPerformSubscriptionOperation/);
  assert.match(publishAction, /findCustomCardArtworkVersion/);
  assert.match(publishAction, /canBusinessPerformSubscriptionOperation/);
  assert.match(publishAction, /prisma\.\$transaction/);
  assert.match(publishAction, /transaction\.business\.update/);
  assert.doesNotMatch(publishAction, /publishCustomCardArtworkCommand/);
});

test("TC5 Custom Card publish semantic command persists only resolved artwork URLs and fixed safe-zone state", () => {
  assert.match(command, /publishCustomCardArtworkCommand/);
  assert.match(command, /updateBusinessSettingsCommand/);
  assert.match(command, /cardDesignMode: "CUSTOM"/);
  assert.match(command, /customCardArtworkEnabled: true/);
  assert.match(command, /customCardFrontArtworkUrl: input\.frontUrl/);
  assert.match(command, /customCardBackArtworkUrl: input\.backUrl/);
  assert.match(command, /customCardSafeZoneVersion: "ID1_V1"/);
  assert.match(command, /\$\{input\.version\}/);
  assert.match(command, /enforceOperateEntitlement: true/);
});

test("TC5 Shared settings authority keeps Custom Card publish persistence and audit atomic behind OPERATE", () => {
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

test("TC5 Custom Card publish command remains storage/provider/environment/schema neutral", () => {
  assert.doesNotMatch(
    command,
    /findCustomCardArtworkVersion|uploadCustomCardArtwork|customCardStorageConfigured|stripe|checkout|webhook|process\.env|prisma/i,
  );
});
