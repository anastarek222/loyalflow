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
