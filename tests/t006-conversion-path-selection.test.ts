import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("T006 homepage routes the primary conversion CTA through one bounded path selector", () => {
  const homepage = source("app/page.tsx");

  assert.match(homepage, /href="\/get-started"/);
  assert.match(homepage, /href="\/accept-owner-invitation"/);
  assert.match(homepage, /href="\/login"/);
});

test("T006 get-started page reuses canonical locale and direction behavior", () => {
  const page = source("app/get-started/page.tsx");

  assert.match(page, /LOCALE_COOKIE_NAME/);
  assert.match(page, /resolveRequestLocale/);
  assert.match(page, /getLocaleDirection/);
  assert.match(page, /LanguageSwitcher locale=\{locale\}/);
  assert.match(page, /<main lang=\{locale\} dir=\{direction\}/);
});

test("T006 path selector exposes only supported existing-account and owner-invitation destinations", () => {
  const page = source("app/get-started/page.tsx");
  const hrefs = [...page.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

  assert.ok(hrefs.includes("/login"));
  assert.ok(hrefs.includes("/accept-owner-invitation"));
  assert.deepEqual(
    [...new Set(hrefs)].sort(),
    ["/", "/accept-owner-invitation", "/login"].sort(),
  );
});

test("T006 path selector is indexable and uses localized metadata", () => {
  const page = source("app/get-started/page.tsx");

  assert.match(page, /conversion\.metaTitle/);
  assert.match(page, /conversion\.metaDescription/);
  assert.match(page, /alternates: \{ canonical: "\/get-started" \}/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
});

test("T006 conversion copy remains in the canonical bilingual catalog", () => {
  const catalog = source("lib/i18n/catalog.ts");

  for (const key of [
    "conversion.title",
    "conversion.body",
    "conversion.existingTitle",
    "conversion.invitedTitle",
    "conversion.noSignup",
  ]) {
    const occurrences = catalog.split(`\"${key}\"`).length - 1;
    assert.equal(occurrences, 2, `${key} should exist once per locale`);
  }
});
