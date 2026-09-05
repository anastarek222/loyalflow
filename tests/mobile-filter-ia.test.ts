import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("responsive filters stay visible on desktop and collapse accessibly on mobile", () => {
  const panel = source("components/responsive-filter-panel.tsx");

  assert.match(panel, /aria-expanded=\{open\}/);
  assert.match(panel, /aria-controls=\{panelId\}/);
  assert.match(panel, /md:hidden/);
  assert.match(panel, /hidden md:block/);
  assert.match(panel, /useState\(defaultOpen\)/);
});

test("filter-heavy SaaS routes use one mobile disclosure and open for active filters", () => {
  for (const file of [
    "app/businesses/page.tsx",
    "app/business-owners/page.tsx",
    "app/businesses/[slug]/users/page.tsx",
    "app/businesses/[slug]/activity/page.tsx",
  ]) {
    const page = source(file);
    assert.match(page, /ResponsiveFilterPanel/);
    assert.match(page, /defaultOpen=\{(?:hasActiveFilters|filtersActive)\}/);
  }
});
