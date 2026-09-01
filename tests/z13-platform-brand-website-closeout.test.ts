import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z13 keeps platform shell brand values in one web-owned authority", () => {
  const brand = source("lib/platform-brand.ts");
  const layout = source("app/layout.tsx");
  const manifest = source("app/manifest.ts");
  const icon = source("app/icon.tsx");
  const appleIcon = source("app/apple-icon.tsx");

  assert.match(brand, /name:\s*"Tanee"/);
  assert.match(brand, /nameAr:\s*"تاني"/);
  assert.match(brand, /iconMark:\s*"ee"/);
  assert.match(brand, /iconGradientStart:\s*"#FF6652"/);
  assert.match(brand, /iconGradientEnd:\s*"#A84724"/);

  for (const consumer of [layout, manifest, icon, appleIcon]) {
    assert.match(
      consumer,
      /import \{ platformBrand \} from "@\/lib\/platform-brand"/,
    );
  }
});

test("Z13 keeps marketing and sign-in platform identity out of view hardcodes", () => {
  const home = source("app/page.tsx");
  const login = source("app/login/page.tsx");

  assert.match(home, /brand=\{copy\("common\.brand"\)\}/);
  assert.match(home, /translate\(locale, "marketing\.metaTitle"\)/);
  assert.match(home, /translate\(locale, "marketing\.metaDescription"\)/);
  assert.doesNotMatch(home, /["'`]LoyalFlow["'`]/);

  assert.match(login, /translate\(locale, "common\.brand"\)/);
  assert.doesNotMatch(login, /["'`]LoyalFlow["'`]/);
});

test("Z13 keeps bilingual website narrative centrally editable through the i18n catalog", () => {
  const catalog = source("lib/i18n/catalog.ts");
  const marketing = source("lib/i18n/marketing.ts");
  const english = source("lib/i18n/locales/en/marketing.ts");
  const arabic = source("lib/i18n/locales/ar/marketing.ts");

  assert.match(catalog, /en:\s*\{/);
  assert.match(catalog, /ar:\s*\{/);
  assert.match(catalog, /\.\.\.commonMessages\.en/);
  assert.match(catalog, /\.\.\.commonMessages\.ar/);
  assert.match(catalog, /import \{ marketingMessages \} from "\.\/marketing"/);
  assert.match(catalog, /\.\.\.marketingMessages\.en/);
  assert.match(catalog, /\.\.\.marketingMessages\.ar/);
  assert.match(marketing, /marketingMessagesEn/);
  assert.match(marketing, /marketingMessagesAr/);

  for (const localeSource of [english, arabic]) {
    assert.match(localeSource, /"marketing\.metaTitle"/);
    assert.match(localeSource, /"marketing\.heroBody"/);
    assert.match(localeSource, /"marketing\.securityBody"/);
    assert.match(localeSource, /"marketing\.faqThreeQuestion"/);
  }
});

test("Z13 does not invent a runtime brand editor or cross the Beta safety boundary", () => {
  const zPlan = source("docs/FINAL_PRODUCT_Z_PLAN.md");
  const brand = source("lib/platform-brand.ts");

  assert.doesNotMatch(brand, /prisma|process\.env|database|provider|stripe/i);
  assert.match(zPlan, /13\. Z13 — Platform Brand & Website Customization/);
  assert.match(zPlan, /14\. Z14 — Final Commercial RC/);
  assert.match(
    zPlan,
    /`READY_FOR_RELEASE_GATES` is reached after Z14\./,
  );
});
