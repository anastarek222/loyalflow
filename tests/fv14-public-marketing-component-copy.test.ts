import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("FV14 marketing component accessibility labels come from the catalog", () => {
  const header = source("components/marketing/marketing-header.tsx");
  const en = source("lib/i18n/locales/en/marketing.ts");
  const ar = source("lib/i18n/locales/ar/marketing.ts");

  for (const catalog of [en, ar]) {
    assert.match(catalog, /"marketing\.primaryNavLabel":/);
    assert.match(catalog, /"marketing\.mobileNavLabel":/);
  }

  assert.match(header, /import \{ translate \} from "@\/lib\/i18n\/catalog"/);
  assert.match(
    header,
    /aria-label=\{translate\(locale, "marketing\.primaryNavLabel"\)\}/,
  );
  assert.match(
    header,
    /aria-label=\{translate\(locale, "marketing\.mobileNavLabel"\)\}/,
  );
  assert.doesNotMatch(header, /locale === "ar" \? "التنقل الرئيسي"/);
  assert.doesNotMatch(header, /locale === "ar" \? "تنقل الهاتف"/);
});

test("FV14 product preview reward copy comes from the catalog", () => {
  const preview = source("components/marketing/product-preview.tsx");
  const en = source("lib/i18n/locales/en/marketing.ts");
  const ar = source("lib/i18n/locales/ar/marketing.ts");

  for (const catalog of [en, ar]) {
    assert.match(catalog, /"marketing\.previewRewardName":/);
  }

  assert.match(preview, /import \{ translate \} from "@\/lib\/i18n\/catalog"/);
  assert.match(
    preview,
    /\{translate\(locale, "marketing\.previewRewardName"\)\}/,
  );
  assert.doesNotMatch(preview, />Free signature drink</);
});
