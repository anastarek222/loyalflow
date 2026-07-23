import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getLanguageAttributes,
  getLanguageCode,
  getLanguageDirection,
  isAppLanguage,
  normalizeLanguage,
} from "../lib/i18n";
import { getPublicCardLocalization } from "../lib/cards/public-card-localization";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("AR resolves to Arabic RTL document attributes", () => {
  assert.deepEqual(getLanguageAttributes("AR"), {
    language: "AR",
    lang: "ar",
    dir: "rtl",
  });
});

test("EN resolves to English LTR document attributes", () => {
  assert.equal(getLanguageCode("EN"), "en");
  assert.equal(getLanguageDirection("EN"), "ltr");
});

test("public-card metadata uses Arabic semantics from the business card language", () => {
  const localization = getPublicCardLocalization("AR", "مريم أحمد");

  assert.deepEqual(localization, {
    language: "AR",
    lang: "ar",
    dir: "rtl",
    description: "بطاقة الولاء الرقمية الخاصة بـ مريم أحمد",
  });
});

test("public-card metadata uses English semantics from the business card language", () => {
  const localization = getPublicCardLocalization("EN", "Maya Smith");

  assert.deepEqual(localization, {
    language: "EN",
    lang: "en",
    dir: "ltr",
    description: "Your digital loyalty card for Maya Smith.",
  });
});

test("public-card AR and EN descriptions are localized differently", () => {
  const arabic = getPublicCardLocalization("AR", "Maya Smith");
  const english = getPublicCardLocalization("EN", "Maya Smith");

  assert.notEqual(arabic.description, english.description);
});

test("invalid language uses the safe AR fallback", () => {
  assert.equal(normalizeLanguage("fr"), "AR");
  assert.deepEqual(getLanguageAttributes(null), {
    language: "AR",
    lang: "ar",
    dir: "rtl",
  });
});

test("user language persistence only accepts supported enum values", () => {
  assert.equal(isAppLanguage("AR"), true);
  assert.equal(isAppLanguage("EN"), true);
  assert.equal(isAppLanguage("ar"), false);
  assert.equal(isAppLanguage("RTL"), false);
  assert.match(source("app/language/actions.ts"), /isAppLanguage\([\s\S]*language/);
});

test("authenticated application direction derives from stored user language", () => {
  const shell = source("components/authenticated-locale-shell.tsx");
  assert.match(shell, /getLanguageAttributes\(user\?\.language\)/);
  assert.match(shell, /lang=\{lang\}/);
  assert.match(shell, /dir=\{dir\}/);
});

test("public card and join flow derive AR and EN direction from card language", () => {
  for (const path of ["app/card/[token]/page.tsx", "app/join/[slug]/page.tsx"]) {
    const page = source(path);
    assert.match(page, /getLanguageAttributes/);
    assert.match(page, /lang=\{lang\}/);
    assert.match(page, /dir=\{dir\}/);
  }
});

test("public-card metadata and manifest use Business.cardDefaultLanguage only", () => {
  const page = source("app/card/[token]/page.tsx");
  const metadata = page.slice(
    page.indexOf("export async function generateMetadata"),
    page.indexOf("const dateFormatter")
  );
  const manifest = source("app/api/card-manifest/[token]/route.ts");

  assert.match(metadata, /cardDefaultLanguage:\s*true/);
  assert.match(
    metadata,
    /getPublicCardLocalization\(\s*customer\.business\.cardDefaultLanguage/
  );
  assert.doesNotMatch(metadata, /searchParams/);
  assert.match(manifest, /cardDefaultLanguage:\s*true/);
  assert.match(
    manifest,
    /getPublicCardLocalization\(\s*customer\.business\.cardDefaultLanguage/
  );
  assert.match(manifest, /lang,\s*\n\s*dir,/);
  assert.doesNotMatch(manifest, /lang:\s*["']ar["']/);
  assert.doesNotMatch(manifest, /dir:\s*["']rtl["']/);
});

test("public-card metadata and manifest retain token safety and branding fields", () => {
  const page = source("app/card/[token]/page.tsx");
  const manifest = source("app/api/card-manifest/[token]/route.ts");

  assert.match(page, /isPublicCardToken\(token\)/);
  assert.match(page, /!customer\s*\|\|\s*!customer\.isActive/);
  assert.match(manifest, /isPublicCardToken\(token\)/);
  assert.match(manifest, /!customer\s*\|\|\s*!customer\.isActive/);
  assert.match(manifest, /name:\s*\n\s*`\$\{customer\.business\.name\} - \$\{customerName\}`/);
  assert.match(manifest, /short_name:/);
  assert.match(manifest, /start_url:/);
  assert.match(manifest, /scope:/);
  assert.match(manifest, /display:/);
  assert.match(manifest, /icons:/);
});

test("technical values are LTR and customer names retain automatic direction", () => {
  const joinPage = source("app/join/[slug]/page.tsx");
  const customerPage = source("app/businesses/[slug]/customers/page.tsx");
  assert.match(joinPage, /name="phone"[\s\S]{0,320}dir="ltr"/);
  assert.match(joinPage, /name="firstName"[\s\S]{0,320}dir="auto"/);
  assert.match(customerPage, /name="phone"[\s\S]{0,220}dir="ltr"/);
  assert.match(customerPage, /name="firstName"[\s\S]{0,260}dir="auto"/);
});

test("notification dialog no longer forces RTL", () => {
  const dialog = source("components/business-notifications-dialog.tsx");
  assert.doesNotMatch(dialog, /dir="rtl"/);
});

test("card language remains passed through to existing membership-card behavior", () => {
  const card = source("app/card/[token]/page.tsx");
  assert.match(card, /defaultLanguage=\{\s*business\.cardDefaultLanguage\s*\}/);
});

test("F6 does not require a Prisma migration", () => {
  const schema = source("prisma/schema.prisma");
  assert.match(schema, /language\s+AppLanguage/);
  assert.match(schema, /cardDefaultLanguage\s+AppLanguage/);
});
