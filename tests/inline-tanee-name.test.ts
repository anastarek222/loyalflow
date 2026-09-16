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

  assert.match(inlineName, /data-inline-tanee-name/);
  assert.match(inlineName, /data-inline-tanee-ee/);
  assert.match(inlineName, />Tan</);
  assert.match(inlineName, />ee</);
  assert.match(inlineName, /text-primary/);
  assert.doesNotMatch(inlineName, /<img|PlatformBrandIdentity|wordmark/);

  assert.match(marketingBrandText, /InlineTaneeName/);
  assert.doesNotMatch(marketingBrandText, /PlatformBrandIdentity|inline-wordmark/);
});

test("Tanee brand name remains English in every locale", () => {
  const platformBrand = source("lib/platform-brand.ts");

  assert.match(platformBrand, /name:\s*["']Tanee["']/);
  assert.match(platformBrand, /nameAr:\s*["']Tanee["']/);
  assert.match(platformBrand, /shortName:\s*["']Tanee["']/);
  assert.doesNotMatch(platformBrand, /nameAr:\s*["']تاني["']/);
});
