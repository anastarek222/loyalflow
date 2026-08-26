import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public Features route is bilingual, indexable, and conversion-ready", () => {
  const page = source("app/features/page.tsx");

  assert.match(page, /alternates: \{ canonical: "\/features" \}/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /getLocaleDirection\(locale\)/);
  assert.match(page, /href="\/get-started"/);
  assert.match(page, /href="\/login"/);
  assert.match(page, /<MarketingFooter locale=\{locale\} \/>/);
  assert.doesNotMatch(page, /checkout|payment|guarantee/i);
});

test("Features is discoverable from the Home page and sitemap", () => {
  const home = source("app/page.tsx");
  const footer = source("components/marketing/marketing-footer.tsx");
  const navigation = source("lib/marketing/public-navigation.ts");
  const sitemap = source("app/sitemap.ts");

  assert.match(home, /getPublicMarketingNavigation\(locale\)/);
  assert.match(navigation, /href: "\/features"/);
  assert.match(home, /<MarketingFooter locale=\{locale\} \/>/);
  assert.match(footer, /href="\/features"/);
  assert.match(sitemap, /publicSiteUrl\("\/features"\)/);
});

test("marketing navigation uses independent routes without Home-page anchors", () => {
  const navigation = source("lib/marketing/public-navigation.ts");
  const home = source("app/page.tsx");
  const features = source("app/features/page.tsx");

  for (const route of ["/", "/features", "/pricing", "/about", "/faq"]) {
    assert.match(navigation, new RegExp(`href: "${route.replace("/", "\\/")}"`));
  }
  assert.doesNotMatch(navigation, /href:\s*"#/);
  assert.doesNotMatch(navigation, /\/#/);
  assert.match(home, /getPublicMarketingNavigation\(locale\)/);
  assert.match(features, /getPublicMarketingNavigation\(locale\)/);
  assert.match(home, /href="\/features"/);
  assert.doesNotMatch(home, /href="#how-it-works"/);
});

test("Pricing, About and FAQ are indexable bilingual public pages", () => {
  const sitemap = source("app/sitemap.ts");
  for (const route of ["pricing", "about", "faq"]) {
    const page = source(`app/${route}/page.tsx`);
    assert.match(page, new RegExp(`canonical: "\\/${route}"`));
    assert.match(page, /getMarketingRequestLocale\(\)/);
    assert.match(page, /<MarketingHeader/);
    assert.match(page, /<MarketingFooter locale=\{locale\} \/>/);
    assert.match(sitemap, new RegExp(`publicSiteUrl\\("\\/${route}"\\)`));
  }
});

test("marketing mobile navigation is a solid viewport portal", () => {
  const header = source("components/marketing/marketing-header.tsx");
  assert.match(header, /createPortal/);
  assert.match(header, /document\.body/);
  assert.match(header, /fixed inset-y-0 end-0 z-\[90\]/);
  assert.match(header, /bg-white/);
  assert.match(header, /aria-modal="true"/);
  assert.match(header, /document\.body\.style\.overflow = "hidden"/);
});

test("Features copy has matching Arabic and English keys", () => {
  const english = source("lib/i18n/locales/en/marketing.ts");
  const arabic = source("lib/i18n/locales/ar/marketing.ts");
  const keys = [...english.matchAll(/"(features\.[^"]+)":/g)].map(
    ([, key]) => key,
  );

  assert.ok(keys.length >= 10);
  for (const key of keys) assert.match(arabic, new RegExp(`"${key}":`));
});
