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
