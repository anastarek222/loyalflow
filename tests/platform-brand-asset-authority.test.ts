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

test("brand-bearing public, auth, onboarding, and shell surfaces consume the shared identity", () => {
  const paths = [
    "components/marketing/marketing-header.tsx",
    "components/marketing/marketing-footer.tsx",
    "components/app-sidebar.tsx",
    "app/login/page.tsx",
    "app/onboarding/page.tsx",
    "app/get-started/page.tsx",
  ];

  for (const path of paths) {
    assert.match(source(path), /<PlatformBrandIdentity/);
  }

  assert.doesNotMatch(source("components/marketing/marketing-header.tsx"), /<Sparkles/);
  assert.doesNotMatch(source("components/marketing/marketing-footer.tsx"), /<Sparkles/);
  assert.doesNotMatch(source("app/login/page.tsx"), /<Sparkles/);
  assert.doesNotMatch(source("app/onboarding/page.tsx"), /<Sparkles/);
});

test("social preview remains fail-closed until a final asset exists", () => {
  const layout = source("app/layout.tsx");

  assert.match(layout, /openGraph: platformBrand\.assets\.socialPreview/);
  assert.match(layout, /twitter: platformBrand\.assets\.socialPreview/);
  assert.match(layout, /: undefined/);
});

test("generated app icons consume the central platform brand fallback authority", () => {
  for (const path of ["app/icon.tsx", "app/apple-icon.tsx"]) {
    const icon = source(path);
    assert.match(icon, /platformBrand\.iconGradientStart/);
    assert.match(icon, /platformBrand\.iconGradientEnd/);
    assert.match(icon, /platformBrand\.iconMark/);
  }
});
