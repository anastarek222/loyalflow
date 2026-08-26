import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("More navigation escapes sticky and backdrop-filter containing blocks", () => {
  const sidebar = source("components/mobile-sidebar.tsx");

  assert.match(sidebar, /import \{ createPortal \} from "react-dom"/);
  assert.match(sidebar, /return createPortal\(/);
  assert.match(sidebar, /document\.body/);
  assert.match(sidebar, /fixed inset-y-0 start-0 z-\[90\]/);
  assert.match(sidebar, /fixed inset-0 z-\[80\]/);
});

test("More navigation uses an opaque readable surface above page content", () => {
  const sidebar = source("components/mobile-sidebar.tsx");
  const css = source("app/globals.css");

  assert.match(sidebar, /bg-surface/);
  assert.match(css, /\.lf-nav-sidebar \{[\s\S]*?background: var\(--lf-surface\)/);
  assert.doesNotMatch(css, /\.lf-nav-sidebar \{[\s\S]{0,160}?backdrop-filter/);
});

test("More navigation keeps modal focus, escape, and scroll-lock behavior", () => {
  const sidebar = source("components/mobile-sidebar.tsx");

  assert.match(sidebar, /aria-modal="true"/);
  assert.match(sidebar, /document\.body\.style\.overflow = "hidden"/);
  assert.match(sidebar, /event\.key === "Escape"/);
  assert.match(sidebar, /event\.key !== "Tab"/);
  assert.match(sidebar, /previousFocus\?\.focus\(\)/);
});
