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
const cardDesignAction = action(
  actions,
  "updateBusinessCardDesignAction",
  "uploadCustomCardArtworkAction",
);
const command = source("lib/server/business/business-card-design-command.ts");
const authorization = source("lib/cards/card-design-permissions.ts");
const sharedSettingsCommand = source("lib/server/business/settings-command.ts");

test("TC5 Card design extraction preserves presentation authorization and active write path until wiring", () => {
  assert.match(cardDesignAction, /cardDesignSchema\.safeParse/);
  assert.match(cardDesignAction, /getAuthorizedCardDesignUpdate/);
  assert.match(cardDesignAction, /imageFileToDataUrl/);
  assert.match(cardDesignAction, /canPerformSubscriptionOperation/);
  assert.match(cardDesignAction, /canBusinessPerformSubscriptionOperation/);
  assert.match(cardDesignAction, /prisma\.\$transaction/);
  assert.match(cardDesignAction, /transaction\.business\.update/);
  assert.doesNotMatch(cardDesignAction, /updateBusinessCardDesignCommand/);
});

test("TC5 Card design permission authority keeps custom mode protected before semantic persistence", () => {
  assert.match(authorization, /role === "SUPER_ADMIN"/);
  assert.match(authorization, /currentDesignMode === "CUSTOM"/);
  assert.match(authorization, /"CUSTOM_READ_ONLY"/);
  assert.match(authorization, /submitted\.cardDesignMode === "CUSTOM"/);
  assert.match(authorization, /"CUSTOM_FORBIDDEN"/);
  assert.match(authorization, /cardDesignMode: "STANDARD"/);
});

test("TC5 Card design semantic command accepts only authorized design data plus resolved logo and delegates persisted OPERATE", () => {
  assert.match(command, /ReturnType<typeof getAuthorizedCardDesignUpdate>/);
  assert.match(command, /authorizedData: AuthorizedCardDesignData/);
  assert.match(command, /logoUrl: string \| null/);
  assert.match(command, /updateBusinessSettingsCommand/);
  assert.match(command, /\.\.\.input\.authorizedData/);
  assert.match(command, /logoUrl: input\.logoUrl/);
  assert.match(command, /enforceOperateEntitlement: true/);
  assert.match(command, /تم تحديث تصميم بطاقة الولاء/);
});

test("TC5 Shared settings authority keeps card design mutation and audit atomic behind persisted OPERATE", () => {
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

test("TC5 Card design command remains storage, provider, environment and schema neutral", () => {
  assert.doesNotMatch(
    command,
    /customCardStorage|uploadCustomCardArtwork|stripe|checkout|webhook|process\.env|prisma/i,
  );
});
