import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("Final Product desktop shell uses semantic theme surfaces and foregrounds", () => {
  const topbar = source("components/app-topbar.tsx");
  const sidebar = source("components/app-sidebar.tsx");
  const shell = `${topbar}\n${sidebar}`;

  assert.doesNotMatch(shell, /\bbg-white(?:\/\d+)?\b/);
  assert.doesNotMatch(shell, /\btext-white\b/);
  assert.doesNotMatch(shell, /\bbg-primary-subtle(?:\/\d+)?\b/);

  assert.match(topbar, /bg-\[var\(--lf-primary-soft\)\] text-primary/);
  assert.match(topbar, /bg-primary[^\n]*text-primary-foreground/);
  assert.match(sidebar, /bg-\[var\(--lf-primary-soft\)\]/);
  assert.match(sidebar, /text-primary-foreground/);
});

test("Final Product shell polish preserves navigation and keyboard authorities", () => {
  const topbar = source("components/app-topbar.tsx");
  const sidebar = source("components/app-sidebar.tsx");

  assert.match(topbar, /buildShellNavigation\(/);
  assert.match(topbar, /handlePopoverEscape\(/);
  assert.match(topbar, /aria-controls="topbar-business-popover"/);
  assert.match(topbar, /aria-controls="topbar-account-popover"/);
  assert.match(sidebar, /buildShellNavigation\(/);
  assert.match(sidebar, /isNavigationItemActive\(/);
  assert.match(sidebar, /aria-current=\{active \? "page" : undefined\}/);
});
