import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("customer bulk operations use semantic product surfaces", () => {
  const bulk = source("components/bulk-customer-operations.tsx");

  assert.match(bulk, /bg-\[var\(--lf-primary-soft\)\]/);
  assert.match(bulk, /border-border bg-surface/);
  assert.match(bulk, /hover:bg-primary-hover/);
  assert.match(bulk, /text-primary-foreground/);
  assert.doesNotMatch(bulk, /bg-white|text-white|bg-primary-subtle/);
});

test("customer bulk operation behavior remains guarded", () => {
  const bulk = source("components/bulk-customer-operations.tsx");

  assert.match(bulk, /destructiveOperations/);
  assert.match(bulk, /window\.confirm\(copy\.confirmBulk/);
  assert.match(bulk, /selectedIds\.length === 0/);
  assert.match(bulk, /operation === "ADD_TAG" \|\| operation === "REMOVE_TAG"/);
});
