import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("Final Product primary controls use canonical interaction states", () => {
  const button = source("components/ui/button.tsx");

  assert.match(button, /bg-primary text-primary-foreground/);
  assert.match(button, /hover:bg-primary-hover/);
  assert.match(button, /active:bg-\[var\(--lf-primary-active\)\]/);
  assert.match(button, /aria-busy=\{loading \|\| undefined\}/);
  assert.match(button, /disabled:isDisabled/);
});

test("Final Product brand and surface primitives use the LoyalFlow hierarchy", () => {
  const badge = source("components/ui/badge.tsx");
  const card = source("components/ui/card.tsx");

  assert.match(badge, /bg-\[var\(--lf-primary-soft\)\] text-primary/);
  assert.doesNotMatch(badge, /bg-primary-subtle/);
  assert.match(card, /rounded-\[var\(--lf-radius-lg\)\]/);
  assert.match(card, /border-border bg-surface/);
  assert.match(card, /hover:border-border-strong/);
});
