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
const backAction = source(
  "app/businesses/[slug]/program/custom-card-back-upload-action.ts",
);
const backCommand = source(
  "lib/server/business/custom-card-back-upload-command.ts",
);
const manager = source("components/custom-card-artwork-manager.tsx");
const programPage = source("app/businesses/[slug]/program/page.tsx");

test("TC5 Custom Card upload command validates required Front and optional Back geometry before entitlement and Blob upload", () => {
  const storage = command.indexOf("customCardStorageConfigured");
  const frontValidation = command.indexOf("validateCustomCardArtwork(input.front)");
  const backNormalization = command.indexOf("const back =");
  const backValidation = command.indexOf("back !== null && !validateCustomCardArtwork(back)");
  const geometrySelection = command.indexOf("const validGeometry = back");
  const pairGeometry = command.indexOf(
    "await validateCustomCardArtworkPair(input.front, back)",
  );
  const singleGeometry = command.indexOf(
    "await validateSingleCustomCardArtwork(input.front)",
  );
  const entitlement = command.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const version = command.indexOf("randomUUID()");
  const upload = command.indexOf("uploadCustomCardArtwork({");

  for (const position of [
    storage,
    frontValidation,
    backNormalization,
    backValidation,
    geometrySelection,
    pairGeometry,
    singleGeometry,
    entitlement,
    version,
    upload,
  ]) {
    assert.ok(position >= 0);
  }

  assert.ok(storage < frontValidation);
  assert.ok(frontValidation < backNormalization);
  assert.ok(backNormalization < backValidation);
  assert.ok(backValidation < geometrySelection);
  assert.ok(geometrySelection < pairGeometry);
  assert.ok(geometrySelection < singleGeometry);
  assert.ok(pairGeometry < entitlement);
  assert.ok(singleGeometry < entitlement);
  assert.ok(entitlement < version);
  assert.ok(version < upload);
  assert.match(command, /"EXPAND"/);
  assert.match(command, /businessId: input\.businessId/);
});

test("TC5 Custom Card geometry failure returns INVALID_UPLOAD before version creation or Blob write", () => {
  const geometry = command.indexOf("const validGeometry = back");
  const geometryFailure = command.indexOf("if (!validGeometry)", geometry);
  const invalid = command.indexOf(
    'return { ok: false, reason: "INVALID_UPLOAD" };',
    geometryFailure,
  );
  const version = command.indexOf("randomUUID()");
  const upload = command.indexOf("uploadCustomCardArtwork({");

  for (const position of [geometry, geometryFailure, invalid, version, upload]) {
    assert.ok(position >= 0);
  }

  assert.ok(geometry < geometryFailure);
  assert.ok(geometryFailure < invalid);
  assert.ok(invalid < version);
  assert.ok(invalid < upload);
});

test("TC5 invalid Custom Card geometry maps to the existing localized Program validation state", () => {
  assert.match(action, /result\.reason === "STORAGE_UNAVAILABLE"/);
  assert.match(backAction, /result\.reason === "STORAGE_UNAVAILABLE"/);
  assert.ok(action.includes("cardDesign=invalid"));
  assert.ok(backAction.includes("cardDesign=invalid"));
  assert.doesNotMatch(action + backAction, /cardDesign=invalid-upload/);
  assert.match(programPage, /query\.cardDesign === "invalid"/);
  assert.match(
    programPage,
    /t\("راجع إعدادات التصميم\.", "Check the card design settings\."\)/,
  );
});

test("TC5 Custom Card upload commands preserve existing private Blob helper ownership", () => {
  assert.match(command, /uploadCustomCardArtwork/);
  assert.match(backCommand, /uploadCustomCardArtwork/);
  assert.match(backCommand, /readPrivateCustomCardArtwork/);
  assert.doesNotMatch(command + backCommand, /@vercel\/blob/);
  assert.doesNotMatch(command + backCommand, /process\.env/);
  assert.doesNotMatch(command + backCommand, /prisma\.\$transaction/);
  assert.doesNotMatch(command + backCommand, /businessActivity/);
});

test("TC5 bounded Custom Card upload actions re-establish auth and Super Admin business authority", () => {
  for (const boundedAction of [action, backAction]) {
    assert.match(boundedAction, /await auth\(\)/);
    assert.match(boundedAction, /prisma\.business\.findUnique/);
    assert.match(boundedAction, /session\.user\.role !== "SUPER_ADMIN"/);
    assert.match(boundedAction, /canManageBusiness\(session\.user, business\.id\)/);
    assert.match(boundedAction, /canPerformSubscriptionOperation/);
    assert.match(boundedAction, /"EXPAND"/);
  }
  assert.match(action, /uploadCustomCardDraftCommand\(/);
  assert.match(backAction, /uploadCustomCardBackCommand\(/);
});

test("TC5 split upload actions preserve controlled feedback and immutable draft redirects", () => {
  for (const boundedAction of [action, backAction]) {
    for (const state of [
      "forbidden",
      "subscription-restricted",
      "storage-unavailable",
      "cardDesign=invalid",
      "cardDesign=draft&customVersion=",
    ]) {
      assert.ok(boundedAction.includes(state));
    }
    assert.doesNotMatch(boundedAction, /uploadCustomCardArtwork/);
    assert.doesNotMatch(boundedAction, /@vercel\/blob|process\.env/);
  }

  assert.match(action, /customCardFrontFile/);
  assert.doesNotMatch(action, /customCardBackFile/);
  assert.match(backAction, /customCardBackFile/);
  assert.match(backAction, /customVersion/);

  assert.match(backCommand, /findCustomCardArtworkVersion/);
  assert.match(backCommand, /readPrivateCustomCardArtwork/);
  assert.match(backCommand, /validateCustomCardArtworkPair\(front, input\.back\)/);
  assert.match(backCommand, /const version = randomUUID\(\)/);
});

test("TC5 Custom Card manager actively binds Front, Back and publish to command-backed actions", () => {
  assert.match(manager, /uploadCustomCardDraftCommandAction/);
  assert.match(
    manager,
    /uploadCustomCardDraftCommandAction\.bind\(null, slug\)/,
  );
  assert.match(manager, /uploadCustomCardBackCommandAction/);
  assert.match(
    manager,
    /uploadCustomCardBackCommandAction\.bind\(null, slug\)/,
  );
  assert.match(manager, /publishCustomCardArtworkAction/);
  assert.match(
    manager,
    /publishCustomCardArtworkAction\.bind\(null, slug\)/,
  );
  assert.match(manager, /<form action=\{uploadCustomArtwork\}/);
  assert.match(manager, /action=\{uploadCustomBack\}/);
  assert.match(manager, /<form action=\{publishCustomArtwork\}>/);
  assert.doesNotMatch(manager, /<form action=\{uploadAction\}/);
  assert.doesNotMatch(manager, /<form action=\{publishAction\}/);
});

test("Program exposes no legacy Settings Custom Card upload or publish wiring", () => {
  assert.doesNotMatch(programPage, /uploadCustomCardArtworkAction/);
  assert.doesNotMatch(programPage, /publishCustomCardArtworkAction/);
  assert.doesNotMatch(programPage, /uploadCustomArtwork/);
  assert.doesNotMatch(programPage, /publishCustomArtwork/);
  assert.doesNotMatch(programPage, /uploadAction=|publishAction=/);
  assert.doesNotMatch(manager, /uploadAction:|publishAction:/);
});
