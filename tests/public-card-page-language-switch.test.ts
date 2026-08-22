import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("public card page can switch AR/EN chrome independently from card presentation", () => {
  const page = source("app/card/[token]/page.tsx");
  const card = source("components/loyalty-card.tsx");

  assert.match(page, /import Link from "next\/link"/);
  assert.match(page, /lang\?: string/);
  assert.match(
    page,
    /query\.lang === "AR" \|\| query\.lang === "EN"[\s\S]*?query\.lang[\s\S]*?: business\.cardDefaultLanguage/,
  );
  assert.match(page, /languageHref = \(nextLanguage: "AR" \| "EN"\)/);
  assert.match(page, /href=\{languageHref\("AR"\)\}/);
  assert.match(page, /href=\{languageHref\("EN"\)\}/);
  assert.match(page, /aria-current=\{language === "AR" \? "page" : undefined\}/);
  assert.match(page, /aria-current=\{language === "EN" \? "page" : undefined\}/);

  assert.match(page, /defaultLanguage:\s*business\.cardDefaultLanguage/);
  assert.match(page, /<PublicLoyaltyCardViewer[\s\S]*?language=\{language\}/);
  assert.match(card, /export const CARD_PRESENTATION_LANGUAGE = "EN" as const/);
  assert.match(card, /language: CARD_PRESENTATION_LANGUAGE/);
});

test("public page language switch preserves authored offer and reward text", () => {
  const page = source("app/card/[token]/page.tsx");

  assert.match(
    page,
    /<p\s+dir="auto"\s+className="font-black text-slate-950"\s*>\s*\{offer\.name\}/,
  );
  assert.match(
    page,
    /<p\s+dir="auto"\s+className="mt-1 text-sm leading-6 text-slate-600"\s*>/,
  );
  assert.match(
    page,
    /<span\s+dir="auto"\s+className="font-bold text-slate-800"\s*>\s*\{reward\.name\}/,
  );
  assert.match(page, /defaultLanguage=\{language\}/);
});

test("public card localization slice does not pull Standard Card theme transport into the page", () => {
  const page = source("app/card/[token]/page.tsx");

  assert.doesNotMatch(
    page,
    /fetch\s*\(\s*[`"'][\s\S]*?\/api\/card\/\$\{[^}]+\}\/theme/,
  );
  assert.doesNotMatch(page, /secondaryColor/);
});
