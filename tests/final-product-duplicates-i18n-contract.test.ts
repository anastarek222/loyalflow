import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("duplicate review resolves the authenticated user language", () => {
  const page = source("app/businesses/[slug]/duplicates/page.tsx");

  assert.match(page, /normalizeLanguage\(currentUser\?\.language\)/);
  assert.match(page, /language === "AR" \? "rtl" : "ltr"/);
  assert.match(page, /getDuplicateReasonLabel\(group\.reason, language\)/);
  assert.match(page, /getReadOnlyMergePreview\(group, language\)/);
  assert.match(page, /Back to customers/);
  assert.match(page, /الرجوع إلى العملاء/);
});

test("duplicate presentation helpers preserve old defaults and support English", () => {
  const duplicates = source("lib/customers/duplicates.ts");

  assert.match(duplicates, /language: DuplicateLanguage = "AR"/);
  assert.match(duplicates, /Matching phone after normalization/);
  assert.match(duplicates, /language: DuplicateLanguage = "EN"/);
  assert.match(duplicates, /Keep every loyalty transaction/);
  assert.match(duplicates, /الاحتفاظ بكل حركة ولاء/);
});

test("duplicate review uses semantic Final Product surfaces", () => {
  const page = source("app/businesses/[slug]/duplicates/page.tsx");

  assert.match(page, /bg-surface-raised/);
  assert.match(page, /bg-\[var\(--lf-primary-soft\)\]/);
  assert.match(page, /text-primary-foreground/);
  assert.doesNotMatch(page, /bg-white|text-white|bg-primary-subtle/);
});
