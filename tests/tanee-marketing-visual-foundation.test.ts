import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Tanee marketing foundation avoids generic AI visual treatments", () => {
  const marketing = [
    source("app/page.tsx"),
    source("components/marketing/marketing-header.tsx"),
    source("components/marketing/product-preview.tsx"),
  ].join("\n");

  assert.doesNotMatch(marketing, /indigo|violet|purple|cyan/);
  assert.doesNotMatch(marketing, /backdrop-blur|blur-3xl/);
  assert.doesNotMatch(marketing, /linear-gradient|radial-gradient/);
  assert.doesNotMatch(marketing, /Sparkles/);
  assert.match(marketing, /bg-primary/);
  assert.match(marketing, /--lf-marketing-canvas/);
});

test("Tanee marketing shell preserves mobile reflow and drawer safety", () => {
  const page = source("app/page.tsx");
  const header = source("components/marketing/marketing-header.tsx");
  const preview = source("components/marketing/product-preview.tsx");

  assert.match(page, /overflow-x-clip/);
  assert.match(page, /\[overflow-wrap:anywhere\]/);
  assert.match(header, /max-w-\[calc\(100vw-1rem\)\]/);
  assert.match(header, /overscroll-contain overflow-y-auto/);
  assert.match(header, /env\(safe-area-inset-top\)/);
  assert.match(header, /env\(safe-area-inset-bottom\)/);
  assert.match(preview, /min-\[390px\]:grid-cols-2/);
  assert.match(preview, /min-\[390px\]:flex-row/);
});

test("Tanee public marketing routes share the clean responsive visual authority", () => {
  const routes = [
    "app/features/page.tsx",
    "app/pricing/page.tsx",
    "app/about/page.tsx",
    "app/faq/page.tsx",
    "app/contact/page.tsx",
    "app/get-started/page.tsx",
    "components/marketing/legal-document-page.tsx",
  ].map(source);
  const marketing = routes.join("\n");

  for (const route of routes) {
    assert.match(route, /overflow-x-clip/);
    assert.match(route, /\[overflow-wrap:anywhere\]/);
  }

  assert.doesNotMatch(marketing, /indigo|violet|purple|cyan/);
  assert.doesNotMatch(marketing, /backdrop-blur|blur-3xl/);
  assert.doesNotMatch(marketing, /linear-gradient|radial-gradient/);
  assert.doesNotMatch(marketing, /Sparkles/);
  assert.match(routes[5], /PlatformBrandIdentity/);
  assert.doesNotMatch(routes[4], /block truncate/);
});
