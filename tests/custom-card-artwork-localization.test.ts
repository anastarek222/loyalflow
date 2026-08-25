import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 13 custom-card artwork flow follows the authenticated AR/EN locale", () => {
  const manager = source("components/custom-card-artwork-manager.tsx");

  assert.match(manager, /getAuthenticatedRequestContext\(\)/);
  assert.match(manager, /normalizeLanguage\(requestContext\?\.user\?\.language\)/);
  assert.match(manager, /language === "AR"/);
  assert.match(manager, /تصميم البطاقة المخصصة · تجريبي/);
  assert.match(manager, /Custom Card artwork · Beta/);
  assert.match(manager, /الواجهة الأمامية · مطلوبة/);
  assert.match(manager, /Front artwork · required/);
  assert.match(manager, /نشر زوج الأمامية \+ الخلفية/);
  assert.match(manager, /Publish this Front \+ Back pair/);
});

test("Stage 13 custom-card localization does not weaken upload or publish safeguards", () => {
  const manager = source("components/custom-card-artwork-manager.tsx");

  assert.match(manager, /customCardFrontFile/);
  assert.match(manager, /customCardBackFile/);
  assert.match(manager, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(manager, /ConfirmedSubmitButton/);
  assert.match(manager, /name="customVersion"/);
  assert.match(manager, /publishCustomCardArtworkAction\.bind\(null, slug\)/);
});
