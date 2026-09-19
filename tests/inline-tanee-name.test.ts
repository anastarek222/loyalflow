import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("inline Tanee references stay as text instead of embedding the full wordmark", () => {
  const inlineName = source("components/brand/inline-tanee-name.tsx");
  const marketingBrandText = source(
    "components/marketing/marketing-brand-text.tsx",
  );
  const sidebar = source("components/app-sidebar.tsx");

  assert.match(inlineName, /data-inline-tanee-name/);
  assert.match(inlineName, /data-inline-tanee-ee/);
  assert.match(inlineName, />Tan</);
  assert.match(inlineName, />ee</);
  assert.match(inlineName, /text-\[#FF6652\]/);
  assert.match(inlineName, /data-inline-tanee-ee-vector/);
  assert.match(inlineName, /viewBox="850 0 650 384"/);
  assert.match(inlineName, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(inlineName, /fillRule="evenodd"/);
  const canonicalWordmark = source("public/brand/tanee-wordmark-en.svg");
  const canonicalEePath = canonicalWordmark.match(
    /<path id="a15-component-4"[^>]* d="([^"]+)"\/>/,
  )?.[1];
  assert.ok(canonicalEePath, "canonical A15 ee ligature path must exist");
  assert.ok(
    inlineName.includes(`d="${canonicalEePath}"`),
    "inline Tanee must use the exact canonical A15 connected-ee geometry",
  );
  assert.doesNotMatch(inlineName, /rotate-45|border-e-\[0\.075em\]|border-t-\[0\.075em\]/);
  assert.doesNotMatch(
    inlineName,
    /<img|<Image|PlatformBrandIdentity|data-marketing-inline-wordmark|\/brand\/[^"']*wordmark/i,
  );

  assert.match(marketingBrandText, /InlineTaneeName/);
  assert.doesNotMatch(marketingBrandText, /PlatformBrandIdentity|inline-wordmark/);
  assert.match(sidebar, /InlineTaneeName/);
});

test("Tanee brand name remains English in every locale", () => {
  const platformBrand = source("lib/platform-brand.ts");

  assert.match(platformBrand, /name:\s*["']Tanee["']/);
  assert.match(platformBrand, /nameAr:\s*["']Tanee["']/);
  assert.match(platformBrand, /shortName:\s*["']Tanee["']/);
  assert.doesNotMatch(platformBrand, /nameAr:\s*["']تاني["']/);
});
