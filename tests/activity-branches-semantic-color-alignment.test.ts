import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Activity uses semantic product surfaces and contrast", () => {
  const activity = source("app/businesses/[slug]/activity/page.tsx");

  assert.doesNotMatch(
    activity,
    /\b(?:bg|text|border)-(?:white|black|slate|gray|zinc|neutral|stone)(?:-\d+)?(?:\/\d+)?\b/,
  );
  assert.match(activity, /border border-border bg-surface p-6/);
  assert.match(activity, /border border-dashed border-border bg-surface p-12/);
  assert.match(activity, /bg-foreground[\s\S]*text-inverse/);
});

test("Branches uses semantic neutral and status color authority", () => {
  const branches = source("app/businesses/[slug]/branches/page.tsx");

  assert.doesNotMatch(
    branches,
    /\b(?:bg|text|border)-(?:white|black|slate|gray|zinc|neutral|stone|emerald|amber|red|violet)(?:-\d+)?(?:\/\d+)?\b/,
  );
  assert.match(branches, /bg-success-subtle text-success/);
  assert.match(branches, /bg-warning-subtle text-warning/);
  assert.match(branches, /border-danger\/30 bg-danger-subtle text-danger/);
  assert.match(branches, /bg-primary[\s\S]*text-primary-foreground/);
  assert.match(branches, /bg-surface-subtle/);
  assert.match(branches, /text-foreground-subtle/);
});
