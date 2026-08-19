import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { platformBrand } from "../lib/platform-brand";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z13 central platform brand authority preserves the current public identity", () => {
  assert.deepEqual(platformBrand, {
    name: "LoyalFlow",
    shortName: "LoyalFlow",
    metadataDescription: "Secure loyalty card and rewards management system.",
    manifestDescriptionAr: "نظام رقمي لإدارة العملاء وبرامج الولاء والمكافآت.",
    themeColor: "#0f172a",
    backgroundColor: "#f1f5f9",
  });
});

test("Z13 root metadata and PWA manifest consume the central brand authority", () => {
  const layout = source("app/layout.tsx");
  const manifest = source("app/manifest.ts");

  assert.match(layout, /import \{ platformBrand \} from "@\/lib\/platform-brand"/);
  assert.match(layout, /default:\s*platformBrand\.name/);
  assert.match(layout, /template:\s*`%s \| \$\{platformBrand\.name\}`/);
  assert.match(layout, /description:\s*platformBrand\.metadataDescription/);
  assert.match(layout, /applicationName:\s*platformBrand\.name/);
  assert.match(layout, /themeColor:\s*platformBrand\.themeColor/);
  assert.doesNotMatch(layout, /"LoyalFlow"/);

  assert.match(manifest, /import \{ platformBrand \} from "@\/lib\/platform-brand"/);
  assert.match(manifest, /name:\s*platformBrand\.name/);
  assert.match(manifest, /short_name:\s*platformBrand\.shortName/);
  assert.match(manifest, /description:\s*platformBrand\.manifestDescriptionAr/);
  assert.match(manifest, /background_color:\s*platformBrand\.backgroundColor/);
  assert.match(manifest, /theme_color:\s*platformBrand\.themeColor/);
  assert.doesNotMatch(manifest, /"LoyalFlow"/);
});

test("Z13 keeps bilingual marketing copy owned by the existing i18n catalog", () => {
  const home = source("app/page.tsx");
  const catalog = source("lib/i18n/catalog.ts");

  assert.match(home, /brand=\{copy\("common\.brand"\)\}/);
  assert.match(home, /title:\s*translate\(locale, "marketing\.metaTitle"\)/);
  assert.match(home, /description:\s*translate\(locale, "marketing\.metaDescription"\)/);
  assert.match(catalog, /\.\.\.commonMessages\.en/);
  assert.match(catalog, /\.\.\.commonMessages\.ar/);
});
