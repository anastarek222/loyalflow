import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { platformBrand } from "../lib/platform-brand";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("platform brand assets default to safe fallbacks until final identity is supplied", () => {
  assert.deepEqual(platformBrand.assets, {
    mark: null,
    wordmark: null,
    socialPreview: null,
  });
  assert.equal(platformBrand.iconMark, "LF");
  assert.equal(platformBrand.name, "LoyalFlow");
});

test("shared brand identity renderer owns mark and wordmark fallbacks", () => {
  const identity = source("components/platform-brand-identity.tsx");

  assert.match(identity, /platformBrand\.assets\.mark/);
  assert.match(identity, /platformBrand\.assets\.wordmark/);
  assert.match(identity, /fallback === "sparkles"/);
  assert.match(identity, /platformBrand\.iconMark/);
  assert.match(identity, /fallbackText = platformBrand\.name/);
});

test("marketing and authenticated shell consume the shared brand identity", () => {
  const header = source("components/marketing/marketing-header.tsx");
  const footer = source("components/marketing/marketing-footer.tsx");
  const sidebar = source("components/app-sidebar.tsx");

  assert.match(header, /<PlatformBrandIdentity/);
  assert.match(footer, /<PlatformBrandIdentity/);
  assert.match(sidebar, /<PlatformBrandIdentity/);
  assert.doesNotMatch(header, /<Sparkles/);
  assert.doesNotMatch(footer, /<Sparkles/);
});

test("social preview remains fail-closed until a final asset exists", () => {
  const layout = source("app/layout.tsx");

  assert.match(layout, /openGraph: platformBrand\.assets\.socialPreview/);
  assert.match(layout, /twitter: platformBrand\.assets\.socialPreview/);
  assert.match(layout, /: undefined/);
});
