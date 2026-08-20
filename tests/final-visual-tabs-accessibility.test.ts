import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = readFileSync(
  join(root, "components/ui/navigation.tsx"),
  "utf8",
);

test("Final Visual shared Tabs use one roving keyboard tab stop", () => {
  assert.match(source, /role="tablist"/);
  assert.match(source, /aria-orientation="horizontal"/);
  assert.match(
    source,
    /tabIndex=\{!item\.disabled && item\.id === rovingTabId \? 0 : -1\}/,
  );
  assert.match(source, /enabledItems = items\.filter\(\(item\) => !item\.disabled\)/);
});

test("Final Visual shared Tabs support horizontal arrow, Home, and End navigation", () => {
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
    assert.match(source, new RegExp(`event\\.key [!=]=? "${key}"|event\\.key === "${key}"`));
  }
  assert.match(source, /getComputedStyle\(tabList\)\.direction/);
  assert.match(source, /direction === "rtl"/);
  assert.match(source, /nextTab\.focus\(\)/);
  assert.match(source, /nextTab\.click\(\)/);
});

test("Final Visual shared Tabs skip disabled tabs and expose a visible focus state", () => {
  assert.match(source, /\[role="tab"\]:not\(:disabled\)/);
  assert.match(source, /onKeyDown=\{handleTabKeyDown\}/);
  assert.match(source, /focus-visible:ring-2/);
});
