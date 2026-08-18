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
  assert.ok(action.includes("cardDesign=invalid"));
  assert.doesNotMatch(action, /cardDesign=invalid-upload/);
  assert.match(programPage, /query\.cardDesign === "invalid"/);
  assert.match(
    programPage,
    /t\("راجع إعدادات التصميم\.", "Check the card design settings\."\)/,
  );
});

test("TC5 Custom Card upload command preserves existing private Blob helper ownership", () => {
  assert.match(command, /uploadCustomCardArtwork/);
  assert.doesNotMatch(command, /@vercel\/blob/);
  assert.doesNotMatch(command, /process\.env/);
  assert.doesNotMatch(command, /prisma\.\$transaction/);
  assert.doesNotMatch(command, /businessActivity/);
});

test("TC5 bounded Custom Card upload action re-establishes auth and Super Admin business authority", () => {
  assert.match(action, /await auth\(\)/);
  assert.match(action, /prisma\.business\.findUnique/);
  assert.match(action, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(action, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(action, /canPerformSubscriptionOperation/);
  assert.match(action, /"EXPAND"/);
  assert.match(action, /uploadCustomCardDraftCommand\(/);
});

test("TC5 bounded Custom Card upload action preserves controlled feedback and draft version redirect", () => {
  for (const state of [
    "forbidden",
    "subscription-restricted",
    "storage-unavailable",
    "cardDesign=invalid",
    "cardDesign=draft&customVersion=",
  ]) {
    assert.ok(action.includes(state));
  }
  assert.match(action, /customCardFrontFile/);
  assert.match(action, /customCardBackFile/);
  assert.doesNotMatch(action, /uploadCustomCardArtwork/);
  assert.doesNotMatch(action, /@vercel\/blob|process\.env/);
});

test("TC5 Custom Card manager actively binds upload and publish to their command-backed actions", () => {
  assert.match(manager, /uploadCustomCardDraftCommandAction/);
  assert.match(
    manager,
    /uploadCustomCardDraftCommandAction\.bind\(null, slug\)/,
  );
  assert.match(manager, /publishCustomCardArtworkAction/);
  assert.match(
    manager,
    /publishCustomCardArtworkAction\.bind\(null, slug\)/,
  );
  assert.match(manager, /<form action=\{uploadCustomArtwork\}/);
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
