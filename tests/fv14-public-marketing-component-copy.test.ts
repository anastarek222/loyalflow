import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("FV14 marketing component accessibility labels come from the catalog", () => {
  const home = source("app/page.tsx");
  const header = source("components/marketing/marketing-header.tsx");
  const en = source("lib/i18n/locales/en/marketing.ts");
  const ar = source("lib/i18n/locales/ar/marketing.ts");

  for (const catalog of [en, ar]) {
    assert.match(catalog, /"marketing\.primaryNavLabel":/);
    assert.match(catalog, /"marketing\.mobileNavLabel":/);
  }

  assert.match(header, /navigationLabel:\s*string/);
  assert.match(header, /mobileNavigationLabel:\s*string/);
  assert.match(header, /aria-label=\{navigationLabel\}/);
  assert.match(header, /aria-label=\{mobileNavigationLabel\}/);
  assert.doesNotMatch(header, /locale === "ar" \? "التنقل الرئيسي"/);
  assert.doesNotMatch(header, /locale === "ar" \? "تنقل الهاتف"/);
  assert.match(home, /navigationLabel=\{copy\("marketing\.primaryNavLabel"\)\}/);
  assert.match(home, /mobileNavigationLabel=\{copy\("marketing\.mobileNavLabel"\)\}/);
});

test("FV14 product preview reward copy comes from the catalog", () => {
  const home = source("app/page.tsx");
  const preview = source("components/marketing/product-preview.tsx");
  const en = source("lib/i18n/locales/en/marketing.ts");
  const ar = source("lib/i18n/locales/ar/marketing.ts");

  for (const catalog of [en, ar]) {
    assert.match(catalog, /"marketing\.previewRewardName":/);
  }

  assert.match(preview, /rewardName:\s*string/);
  assert.match(preview, /\{labels\.rewardName\}/);
  assert.doesNotMatch(preview, />Free signature drink</);
  assert.match(home, /rewardName:\s*copy\("marketing\.previewRewardName"\)/);
});
