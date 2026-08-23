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
  const english = source("packages/i18n/src/locales/en/onboarding.ts");
  const arabic = source("packages/i18n/src/locales/ar/onboarding.ts");

  assert.match(catalog, /from "@loyalflow\/i18n\/onboarding"/);
  assert.match(catalog, /\.\.\.onboardingMessages\.en/);
  assert.match(catalog, /\.\.\.onboardingMessages\.ar/);

  for (const key of [
    "onboarding.eyebrow",
    "onboarding.title",
    "onboarding.description",
    "onboarding.privateNote",
  ]) {
    assert.equal(
      english.split(`\"${key}\"`).length - 1,
      1,
      `${key} should exist once in the English source`,
    );
    assert.equal(
      arabic.split(`\"${key}\"`).length - 1,
      1,
      `${key} should exist once in the Arabic source`,
    );
    assert.equal(
      catalog.split(`\"${key}\"`).length - 1,
      0,
      `${key} should not be duplicated inline by the compatibility catalog`,
    );
  }
});

test("T006 onboarding remains private and preserves the existing owner wizard writer boundary", () => {
  const page = source("app/onboarding/page.tsx");

  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /saveAction=\{saveOwnerOnboardingAction\}/);
  assert.match(page, /launchAction=\{launchOwnerOnboardingAction\}/);
  assert.doesNotMatch(page, /signup|checkout|stripe|analytics/i);
});
