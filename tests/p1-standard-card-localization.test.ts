import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const setup = source("components/standard-card-setup.tsx");
const owner = source("components/owner-onboarding-wizard.tsx");
const program = source("app/businesses/[slug]/program/page.tsx");

test("P1 Standard Card setup requires an explicit AR/EN language instead of silently defaulting to English", () => {
  assert.match(setup, /language: CardSetupLanguage;/);
  assert.doesNotMatch(setup, /language\?:\s*CardSetupLanguage/);
  assert.doesNotMatch(setup, /language\s*=\s*["']EN["']/);
  assert.match(setup, /dir=\{language === ["']AR["'] \? ["']rtl["'] : ["']ltr["']\}/);
});

test("P1 Standard Card visible controls and categories carry canonical Arabic and English copy", () => {
  for (const pair of [
    ["تصميم البطاقة", "Card design"],
    ["إعدادات البطاقة القياسية", "Standard Card settings"],
    ["اللون الأساسي", "Primary colour"],
    ["اللون الثانوي", "Secondary colour"],
    ["فئة النشاط المعتمدة", "Approved business category"],
    ["معاينة البطاقة مباشرة", "Live Card Preview"],
    ["الوجه", "Front"],
    ["الظهر", "Back"],
    ["مقهى", "Cafe"],
  ] as const) {
    assert.ok(setup.includes(pair[0]), `missing Arabic copy: ${pair[0]}`);
    assert.ok(setup.includes(pair[1]), `missing English copy: ${pair[1]}`);
  }
  assert.match(setup, /categoryLabel\(category, language\)/);
});

test("P1 every known StandardCardSetup caller propagates the active language", () => {
  assert.match(owner, /<StandardCardSetup[\s\S]*?language=\{locale === ["']ar["'] \? ["']AR["'] : ["']EN["']\}/);
  assert.match(program, /<StandardCardSetup[\s\S]*?language=\{language\}/);
});
