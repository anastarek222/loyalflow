import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("notification centre resolves the authenticated app language once per request", () => {
  const resolver = source("lib/auth/current-app-language.ts");
  const dialog = source("components/business-notifications-dialog.tsx");
  const content = source("components/business-notifications-content.tsx");

  assert.match(resolver, /cache\(async/);
  assert.match(resolver, /select: \{ language: true \}/);
  assert.match(dialog, /getAuthenticatedAppLanguage/);
  assert.match(content, /getAuthenticatedAppLanguage/);
});

test("notification dialog, content, read controls, and dates have AR and EN paths", () => {
  const dialog = source("components/business-notifications-dialog-client.tsx");
  const content = source("components/business-notifications-content.tsx");
  const readButton = source("components/notification-read-button.tsx");

  for (const file of [dialog, content, readButton]) {
    assert.match(file, /AR:/);
    assert.match(file, /EN:/);
  }

  assert.match(dialog, /Important notifications/);
  assert.match(dialog, /Mark all as read/);
  assert.match(content, /Latest notifications/);
  assert.match(content, /Reward redemptions/);
  assert.match(readButton, /Mark as read/);
  assert.match(content, /getLanguageLocale\(language\)/);
  assert.doesNotMatch(content, /Intl\.DateTimeFormat\("ar-EG"/);
});
