import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("frontend foundation loads stable Arabic typography and dark-capable browser controls", () => {
  const layout = source("app/layout.tsx");
  const foundation = source("app/frontend-foundation.css");

  assert.match(layout, /Alexandria/);
  assert.match(layout, /--font-arabic/);
  assert.match(layout, /colorScheme:\s*["']light dark["']/);
  assert.match(layout, /frontend-foundation\.css/);

  assert.match(foundation, /--lf-font-arabic:\s*var\(--font-arabic\)/);
  assert.match(foundation, /:lang\(ar\)/);
  assert.match(foundation, /letter-spacing:\s*0/);
  assert.match(foundation, /text-transform:\s*none/);
  assert.match(foundation, /\.dark\s*\{/);
  assert.match(foundation, /--lf-surface:/);
  assert.match(foundation, /\.dark \.lf-topbar/);
  assert.match(foundation, /\.dark \.lf-mobile-nav/);
});

test("shared controls and headings normalize RTL visual rhythm", () => {
  const marketingLanguage = source("components/i18n/language-switcher.tsx");
  const productLanguage = source("components/language-switcher.tsx");
  const topbar = source("components/app-topbar.tsx");
  const sidebar = source("components/app-sidebar.tsx");
  const pageHeader = source("components/page-layout/page-header.tsx");
  const table = source("components/ui/table.tsx");

  assert.match(marketingLanguage, /min-h-11/);
  assert.match(productLanguage, /min-h-11/);
  assert.match(topbar, /min-h-11 max-w-52/);
  assert.match(topbar, /rtl:normal-case rtl:tracking-normal/);
  assert.match(sidebar, /rtl:normal-case rtl:tracking-normal/);
  assert.match(pageHeader, /rtl:normal-case rtl:tracking-normal/);
  assert.match(table, /rtl:normal-case rtl:tracking-normal/);
});

test("shared fallback states are bilingual instead of English-only", () => {
  const directionText = source("components/i18n/direction-text.tsx");
  const states = source("components/page-layout/states.tsx");
  const dialog = source("components/ui/dialog.tsx");
  const table = source("components/ui/table.tsx");

  assert.match(directionText, /rtl:hidden/);
  assert.match(directionText, /rtl:inline/);
  assert.match(states, /DirectionText/);
  assert.match(states, /تعذر تحميل هذه الصفحة/);
  assert.match(dialog, /جارٍ التنفيذ/);
  assert.match(table, /جارٍ تحميل الجدول/);
});
