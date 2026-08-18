import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("Final Product page headers use the canonical raised product surface", () => {
  const pageHeader = source("components/page-layout/page-header.tsx");

  assert.match(pageHeader, /border-border bg-surface-raised/);
  assert.match(pageHeader, /shadow-\[var\(--lf-shadow-raised\)\]/);
  assert.match(pageHeader, /<h1 className="lf-type-display text-foreground">/);
  assert.doesNotMatch(pageHeader, /(?:bg|border)-white/);
});

test("Final Product KPI surfaces use semantic status and brand tokens", () => {
  const stat = source("components/page-layout/stat.tsx");

  assert.match(stat, /neutral: "before:bg-foreground-subtle"/);
  assert.match(stat, /bg-\[var\(--lf-primary-soft\)\] text-primary/);
  assert.doesNotMatch(stat, /bg-primary-subtle|border-white/);
});

test("Final Product summary panels share the product surface hierarchy", () => {
  const summary = source("components/page-layout/summary-panel.tsx");

  assert.match(summary, /rounded-\[var\(--lf-radius-lg\)\]/);
  assert.match(summary, /border-border bg-surface/);
  assert.match(summary, /shadow-\[var\(--lf-shadow-raised\)\]/);
});
