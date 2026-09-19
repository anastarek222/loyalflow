import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Reports use semantic status colors and preserve only the inverse-panel mint accent", () => {
  const reports = source("app/businesses/[slug]/reports/page.tsx");
  const legacy =
    reports.match(
      /\b(?:bg|text|border|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|emerald|amber|red|violet)(?:-\d+)?(?:\/\d+)?\b/g,
    ) ?? [];

  assert.deepEqual(legacy.sort(), ["text-emerald-300", "text-emerald-300"].sort());
  assert.match(reports, /bg-success-subtle text-success/);
  assert.match(reports, /bg-warning-subtle text-warning/);
  assert.match(reports, /bg-danger-subtle text-danger/);
  assert.match(reports, /text-primary-foreground/);
  assert.equal(reports.includes("سجله تاني"), false);
  assert.match(reports, /سجله Tanee/);
});

test("Staff reports use semantic status colors", () => {
  const staff = source("app/businesses/[slug]/reports/staff/page.tsx");

  assert.doesNotMatch(
    staff,
    /\b(?:bg|text|border|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|emerald|amber|red|violet)(?:-\d+)?(?:\/\d+)?\b/,
  );
  assert.match(staff, /bg-success-subtle/);
  assert.match(staff, /bg-warning-subtle/);
  assert.match(staff, /text-success/);
  assert.match(staff, /text-warning/);
  assert.match(staff, /text-primary-foreground/);
});
