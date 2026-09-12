import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Stitch marketing theme stays isolated from authenticated product UI", () => {
  const styles = source("app/globals.css");
  const switcher = source("components/marketing/marketing-theme-switcher.tsx");
  const authority = source("lib/marketing/theme.ts");

  assert.match(
    styles,
    /html\[data-marketing-theme="dark"\] \.lf-marketing-surface/,
  );
  assert.doesNotMatch(switcher, /classList\.(?:add|toggle)\("dark"/);
  assert.match(authority, /tanee-marketing-theme/);
  assert.match(
    source("components/marketing/marketing-header.tsx"),
    /className="lf-marketing-surface fixed inset-y-0 end-0/,
  );
});

test("public marketing routes opt into the shared theme surface", () => {
  const routes = [
    "app/page.tsx",
    "app/features/page.tsx",
    "app/pricing/page.tsx",
    "app/about/page.tsx",
    "app/faq/page.tsx",
    "app/contact/page.tsx",
    "app/data-deletion/page.tsx",
    "app/demo/page.tsx",
    "components/marketing/legal-document-page.tsx",
    "app/get-started/page.tsx",
  ];

  for (const route of routes) {
    assert.match(source(route), /lf-marketing-surface/);
  }
});

test("marketing content uses the current 14-day Trial truth in both locales", () => {
  const english = source("lib/i18n/locales/en/marketing.ts");
  const arabic = source("lib/i18n/locales/ar/marketing.ts");

  assert.doesNotMatch(english, /seven-day Trial/i);
  assert.doesNotMatch(arabic, /(?:7|٧) أيام/);
  assert.match(english, /14-day Trial/);
  assert.match(arabic, /14 يومًا/);
});

test("Home follows the supplied Stitch narrative without placeholder routes", () => {
  const home = source("app/page.tsx");

  for (const key of [
    "marketing.home.problemTitle",
    "marketing.home.relationshipTitle",
    "marketing.home.journeyTitle",
    "marketing.home.benefitsTitle",
    "marketing.home.outcomesTitle",
    "marketing.home.ownershipTitle",
    "marketing.home.finalTitle",
  ]) {
    assert.match(home, new RegExp(key.replaceAll(".", "\\.")));
  }

  assert.doesNotMatch(home, /href=["']#["']/);
  assert.match(home, /rtl:-scale-x-100/);
});

test("marketing wordmarks keep explicit production dimensions", () => {
  const identity = source("components/platform-brand-identity.tsx");
  const header = source("components/marketing/marketing-header.tsx");
  const footer = source("components/marketing/marketing-footer.tsx");
  const styles = source("app/globals.css");

  assert.match(identity, /data-platform-brand-wordmark-size/);
  assert.match(header, /showMark=\{false\}/);
  assert.match(header, /wordmarkSize="marketing"/);
  assert.match(footer, /wordmarkSize="marketing-footer"/);
  assert.match(styles, /wordmark-size="marketing"/);
  assert.match(styles, /block-size:\s*1\.75rem/);
  assert.match(header, /themeAdaptiveWordmark/);
  assert.match(styles, /wordmark-theme="dark"/);
  assert.match(
    styles,
    /\.lf-marketing-surface \[data-platform-brand-wordmark-theme="dark"\]\s*\{\s*display: none;/,
  );
  assert.match(
    source("public/brand/tanee-wordmark-en-dark.svg"),
    /fill="#FFF9F5"/,
  );
});

test("marketing language controls offer only the alternate locale", () => {
  const switcher = source("components/i18n/language-switcher.tsx");
  const header = source("components/marketing/marketing-header.tsx");
  const footer = source("components/marketing/marketing-footer.tsx");

  assert.match(switcher, /alternateOnly/);
  assert.match(header, /<LanguageSwitcher locale=\{locale\} alternateOnly \/>/);
  assert.match(footer, /<LanguageSwitcher locale=\{locale\} alternateOnly \/>/);
});
