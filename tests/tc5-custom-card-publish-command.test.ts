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

const legacyActions = source("app/businesses/[slug]/settings/actions.ts");
const legacyPublishAction = action(
  legacyActions,
  "publishCustomCardArtworkAction",
  "syncGoogleSheetAction",
);
const wiredAction = source(
  "app/businesses/[slug]/program/custom-card-publish-action.ts",
);
const manager = source("components/custom-card-artwork-manager.tsx");
const command = source("lib/server/business/custom-card-publish-command.ts");
const sharedSettingsCommand = source("lib/server/business/settings-command.ts");

test("TC5 Custom Card manager routes the active Publish form through the command-backed Program action", () => {
  assert.match(
    manager,
    /publishCustomCardArtworkAction.*custom-card-publish-action/,
  );
  assert.match(
    manager,
    /publishCustomCardArtworkAction\.bind\(null, slug\)/,
  );
  assert.match(manager, /form action=\{publishCustomArtwork\}/);
  assert.doesNotMatch(manager, /form action=\{publishAction\}/);
  assert.doesNotMatch(
    manager,
    /publishAction: \(formData: FormData\) => Promise<void>/,
  );
});

test("TC5 wired Custom Card publish action preserves transport policy and delegates persistence", () => {
  assert.match(wiredAction, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(wiredAction, /canManageBusiness/);
  assert.match(wiredAction, /canPerformSubscriptionOperation/);
  assert.match(wiredAction, /findCustomCardArtworkVersion/);
  assert.match(wiredAction, /publishCustomCardArtworkCommand/);
  assert.match(wiredAction, /frontUrl: artwork\.frontUrl/);
  assert.match(wiredAction, /backUrl: artwork\.backUrl/);
  assert.match(wiredAction, /if \(!published\.ok\)/);
  assert.match(wiredAction, /revalidatePath/);
  assert.match(wiredAction, /cardDesign=published/);
  assert.doesNotMatch(
    wiredAction,
    /prisma\.\$transaction|transaction\.business\.update|canBusinessPerformSubscriptionOperation/,
  );
});

test("TC5 legacy Settings publish action remains compatibility-only during bounded wiring", () => {
  assert.match(legacyPublishAction, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(legacyPublishAction, /findCustomCardArtworkVersion/);
  assert.match(legacyPublishAction, /prisma\.\$transaction/);
  assert.match(legacyPublishAction, /transaction\.business\.update/);
  assert.doesNotMatch(
    legacyPublishAction,
    /publishCustomCardArtworkCommand/,
  );
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
