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

test("TC5 Custom Card upload command owns bounded storage validation and persisted EXPAND enforcement", () => {
  const storage = command.indexOf("customCardStorageConfigured");
  const frontValidation = command.indexOf("validateCustomCardArtwork(input.front)");
  const backValidation = command.indexOf("validateCustomCardArtwork(input.back)");
  const entitlement = command.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const version = command.indexOf("randomUUID()");
  const upload = command.indexOf("uploadCustomCardArtwork({");

  for (const position of [
    storage,
    frontValidation,
    backValidation,
    entitlement,
    version,
    upload,
  ]) {
    assert.ok(position >= 0);
  }

  assert.ok(storage < frontValidation);
  assert.ok(frontValidation < entitlement);
  assert.ok(backValidation < entitlement);
  assert.ok(entitlement < version);
  assert.ok(version < upload);
  assert.match(command, /"EXPAND"/);
  assert.match(command, /businessId: input\.businessId/);
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

test("TC5 bounded Custom Card upload action preserves existing feedback and draft version redirect", () => {
  for (const state of [
    "forbidden",
    "subscription-restricted",
    "storage-unavailable",
    "invalid-upload",
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
