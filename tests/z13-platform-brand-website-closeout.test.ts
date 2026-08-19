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

  assert.match(brand, /name:\s*"LoyalFlow"/);
  assert.match(brand, /iconMark:\s*"LF"/);
  assert.match(brand, /iconGradientStart:\s*"#020617"/);
  assert.match(brand, /iconGradientEnd:\s*"#2563eb"/);

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

  assert.match(catalog, /en:\s*\{/);
  assert.match(catalog, /ar:\s*\{/);
  assert.match(catalog, /\.\.\.commonMessages\.en/);
  assert.match(catalog, /\.\.\.commonMessages\.ar/);
  assert.match(catalog, /"marketing\.metaTitle"/);
  assert.match(catalog, /"marketing\.heroBody"/);
  assert.match(catalog, /"marketing\.securityBody"/);
  assert.match(catalog, /"marketing\.faqThreeQuestion"/);
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
