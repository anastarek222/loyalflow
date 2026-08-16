import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("TC5 Business Settings command owns the authoritative atomic write", () => {
  const command = source("lib/server/business/settings-command.ts");

  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /canBusinessPerformSubscriptionOperation/);
  assert.match(command, /"OPERATE"/);
  assert.match(command, /transaction\.business\.update/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.match(command, /BUSINESS_SETTINGS_UPDATED/);
  assert.match(command, /activityRequestMetadata/);
});

test("TC5 Business Settings command keeps presentation and optional provider sync outside", () => {
  const command = source("lib/server/business/settings-command.ts");

  assert.doesNotMatch(command, /next\/cache|revalidatePath/);
  assert.doesNotMatch(command, /next\/navigation|redirect\(/);
  assert.doesNotMatch(command, /google-sheets|syncBusinessToGoogleSheetSafely/);
});

test("TC5 Business Settings command reports subscription restriction without redirecting", () => {
  const command = source("lib/server/business/settings-command.ts");

  assert.match(command, /SUBSCRIPTION_RESTRICTED/);
  assert.match(command, /Readonly<\{ ok: true \}>/);
  assert.match(command, /Readonly<\{ ok: false; reason: "SUBSCRIPTION_RESTRICTED" \}>/);
});
