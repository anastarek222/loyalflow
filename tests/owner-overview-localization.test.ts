import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 13 owner overview keeps segment shortcuts in the authenticated language", () => {
  const overview = source("app/businesses/[slug]/page.tsx");

  assert.match(overview, /getCustomerSegmentLabel\(segment, language\)/);
  assert.doesNotMatch(
    overview,
    /<span>\{getCustomerSegmentLabel\(segment\)\}<\/span>/,
  );
});

test("Stage 13 owner overview localizes the advanced KPI accessibility label", () => {
  const overview = source("app/businesses/[slug]/page.tsx");

  assert.match(overview, /dailyKpis: "مؤشرات الأداء الرئيسية اليومية"/);
  assert.match(overview, /dailyKpis: "Daily key performance indicators"/);
  assert.match(overview, /<section aria-label=\{dictionary\.dailyKpis\}>/);
  assert.doesNotMatch(
    overview,
    /<section aria-label="Daily key performance indicators">/,
  );
});
