import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const command = source("lib/server/business/custom-card-upload-command.ts");
const action = source(
  "app/businesses/[slug]/program/custom-card-upload-action.ts",
);
const backCommand = source(
  "lib/server/business/custom-card-back-upload-command.ts",
);
const manager = source("components/custom-card-artwork-manager.tsx");
const programPage = source("app/businesses/[slug]/program/page.tsx");

test("TC5 Custom Card upload command validates the required pair before entitlement and Blob upload", () => {
  const storage = command.indexOf("customCardStorageConfigured");
  const frontValidation = command.indexOf("validateCustomCardArtwork(input.front)");
  const backValidation = command.indexOf("validateCustomCardArtwork(input.back)");
  const pairGeometry = command.indexOf(
    "validateCustomCardArtworkPair(input.front, input.back)",
  );
  const entitlement = command.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const version = command.indexOf("randomUUID()");
  const upload = command.indexOf("uploadCustomCardArtwork({");

  for (const position of [
    storage,
    frontValidation,
    backValidation,
    pairGeometry,
    entitlement,
    version,
    upload,
  ]) {
    assert.ok(position >= 0);
  }

  assert.ok(storage < frontValidation);
  assert.ok(frontValidation < pairGeometry);
  assert.ok(backValidation < pairGeometry);
  assert.ok(pairGeometry < entitlement);
  assert.ok(entitlement < version);
  assert.ok(version < upload);
  assert.match(command, /"EXPAND"/);
  assert.match(command, /businessId: input\.businessId/);
  assert.doesNotMatch(command, /validateSingleCustomCardArtwork/);
});

test("TC5 invalid Custom Card pair returns INVALID_UPLOAD before version creation or Blob write", () => {
  const geometry = command.indexOf(
    "validateCustomCardArtworkPair(input.front, input.back)",
  );
  const invalid = command.indexOf(
    'return { ok: false, reason: "INVALID_UPLOAD" };',
    geometry,
  );
  const version = command.indexOf("randomUUID()");
  const upload = command.indexOf("uploadCustomCardArtwork({");

  for (const position of [geometry, invalid, version, upload]) {
    assert.ok(position >= 0);
  }

  assert.ok(geometry < invalid);
  assert.ok(invalid < version);
  assert.ok(invalid < upload);
});

test("TC5 paired upload action maps controlled errors to existing Program states", () => {
  assert.match(action, /result\.reason === "STORAGE_UNAVAILABLE"/);
  assert.ok(action.includes("cardDesign=invalid"));
  assert.doesNotMatch(action, /cardDesign=invalid-upload/);
  assert.match(programPage, /query\.cardDesign === "invalid"/);
  assert.match(
    programPage,
    /t\("راجع إعدادات التصميم\.", "Check the card design settings\."\)/,
  );
});

test("TC5 Custom Card upload command preserves private Blob helper ownership", () => {
  assert.match(command, /uploadCustomCardArtwork/);
  assert.doesNotMatch(command, /@vercel\/blob/);
  assert.doesNotMatch(command, /process\.env/);
  assert.doesNotMatch(command, /prisma\.\$transaction/);
  assert.doesNotMatch(command, /businessActivity/);
});

test("TC5 paired upload action re-establishes auth and Super Admin business authority", () => {
  assert.match(action, /await auth\(\)/);
  assert.match(action, /prisma\.business\.findUnique/);
  assert.match(action, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(action, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(action, /canPerformSubscriptionOperation/);
  assert.match(action, /"EXPAND"/);
  assert.match(action, /uploadCustomCardDraftCommand\(/);
});

test("TC5 paired upload action carries both sides and keeps immutable draft redirects", () => {
  for (const state of [
    "forbidden",
    "subscription-restricted",
    "storage-unavailable",
    "cardDesign=invalid",
    "cardDesign=draft&customVersion=",
  ]) {
    assert.ok(action.includes(state));
  }
  assert.doesNotMatch(action, /uploadCustomCardArtwork/);
  assert.doesNotMatch(action, /@vercel\/blob|process\.env/);
  assert.match(action, /customCardFrontFile/);
  assert.match(action, /customCardBackFile/);
});

test("TC5 legacy Back-only command is compatibility-only and fails closed", () => {
  assert.match(backCommand, /void input;/);
  assert.match(
    backCommand,
    /return \{ ok: false, reason: "INVALID_UPLOAD" \};/,
  );
  assert.doesNotMatch(backCommand, /findCustomCardArtworkVersion/);
  assert.doesNotMatch(backCommand, /readPrivateCustomCardArtwork/);
  assert.doesNotMatch(backCommand, /uploadCustomCardArtwork/);
});

test("TC5 Custom Card manager binds the paired upload and confirmed publish actions", () => {
  assert.match(manager, /uploadCustomCardDraftCommandAction/);
  assert.match(
    manager,
    /uploadCustomCardDraftCommandAction\.bind\(null, slug\)/,
  );
  assert.doesNotMatch(manager, /uploadCustomCardBackCommandAction/);
  assert.match(manager, /publishCustomCardArtworkAction/);
  assert.match(
    manager,
    /publishCustomCardArtworkAction\.bind\(null, slug\)/,
  );
  assert.match(manager, /<form action=\{uploadCustomArtwork\}/);
  assert.match(manager, /<form action=\{publishCustomArtwork\}>/);
  assert.match(manager, /ConfirmedSubmitButton/);
});

test("Program exposes no legacy Settings Custom Card upload or publish wiring", () => {
  assert.doesNotMatch(programPage, /uploadCustomCardArtworkAction/);
  assert.doesNotMatch(programPage, /publishCustomCardArtworkAction/);
  assert.doesNotMatch(programPage, /uploadCustomArtwork/);
  assert.doesNotMatch(programPage, /publishCustomArtwork/);
  assert.doesNotMatch(programPage, /uploadAction=|publishAction=/);
  assert.doesNotMatch(manager, /uploadAction:|publishAction:/);
});
