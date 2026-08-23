import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("super admin businesses workspace resolves AR/EN language", () => {
  const page = source("app/businesses/page.tsx");

  assert.match(page, /normalizeLanguage\(currentUser\?\.language\)/);
  assert.match(page, /language === "AR" \? "rtl" : "ltr"/);
  assert.match(page, /الأنشطة التجارية/);
  assert.match(page, /Platform administration/);
  assert.match(page, /Search businesses/);
});

test("businesses workspace keeps canonical filter and pagination behavior", () => {
  const page = source("app/businesses/page.tsx");

  assert.match(page, /SORT_OPTIONS\[sort\]/);
  assert.match(page, /skip: \(currentPage - 1\) \* BUSINESSES_PER_PAGE/);
  assert.match(page, /take: BUSINESSES_PER_PAGE/);
  assert.match(page, /buildBusinessesUrl\(currentPage - 1\)/);
  assert.match(page, /buildBusinessesUrl\(currentPage \+ 1\)/);
});

test("businesses workspace uses Final Product semantic surfaces", () => {
  const page = source("app/businesses/page.tsx");

  assert.match(page, /<PageHeader/);
  assert.match(page, /bg-surface/);
  assert.match(page, /hover:bg-primary-hover/);
  assert.doesNotMatch(page, /bg-white|text-white|bg-primary-subtle/);
});
