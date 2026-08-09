import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("T006 onboarding shell reuses canonical locale cookie, direction and switcher", () => {
  const page = source("app/onboarding/page.tsx");

  assert.match(page, /LOCALE_COOKIE_NAME/);
  assert.match(page, /resolveRequestLocale/);
  assert.match(page, /getLocaleDirection/);
  assert.match(page, /<main[\s\S]*lang=\{locale\}[\s\S]*dir=\{direction\}/);
  assert.match(page, /LanguageSwitcher locale=\{locale\}/);
});

test("T006 onboarding shell copy stays in the canonical bilingual catalog", () => {
  const catalog = source("lib/i18n/catalog.ts");

  for (const key of [
    "onboarding.eyebrow",
    "onboarding.title",
    "onboarding.description",
    "onboarding.privateNote",
  ]) {
    const occurrences = catalog.split(`\"${key}\"`).length - 1;
    assert.equal(occurrences, 2, `${key} should exist once per locale`);
  }
});

test("T006 onboarding remains private and preserves the existing owner wizard writer boundary", () => {
  const page = source("app/onboarding/page.tsx");

  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /saveAction=\{saveOwnerOnboardingAction\}/);
  assert.match(page, /launchAction=\{launchOwnerOnboardingAction\}/);
  assert.doesNotMatch(page, /signup|checkout|stripe|analytics/i);
});
