import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("How Tanee Works is a bilingual, indexable Marketing route", () => {
  const page = source("app/how-it-works/page.tsx");

  assert.match(page, /alternates: \{ canonical: "\/how-it-works" \}/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /getMarketingRequestLocale\(\)/);
  assert.match(page, /getLocaleDirection\(locale\)/);
  assert.match(page, /getMarketingHowItWorksCopy/);
  assert.match(page, /<MarketingHeader/);
  assert.match(page, /<MarketingFooter locale=\{locale\} \/>/);
  assert.match(page, /href="\/get-started"/);
  assert.match(page, /href="\/features"/);
  assert.match(page, /href="\/privacy"/);
  assert.match(page, /<details/);
  assert.match(page, /rtl:-scale-x-100/);
});

test("How Tanee Works preserves the six-step Stitch narrative with current product truth", () => {
  const page = source("app/how-it-works/page.tsx");
  const pageCopy = source("lib/marketing/how-it-works.ts");

  for (const step of [
    "setup",
    "join",
    "activity",
    "progress",
    "reward",
    "relationship",
  ]) {
    assert.match(pageCopy, new RegExp(`id: "${step}"`));
  }

  assert.match(pageCopy, /MARKETING_HOW_IT_WORKS_TRIAL_DAYS = 14/);
  assert.match(pageCopy, /14 days free/);
  assert.match(pageCopy, /14 يومًا مجانًا/);
  assert.match(pageCopy, /visits, points or sales-based progress/);
  assert.match(pageCopy, /الزيارات أو النقاط أو قيمة المبيعات/);
  assert.doesNotMatch(
    pageCopy,
    /7 days free|7 أيام مجانًا|under 7 minutes|أقل من 7 دقائق/i,
  );
  assert.doesNotMatch(pageCopy, /Apple Wallet|one-time barcode|booking/i);
  assert.doesNotMatch(page, /APPROVED TANEE|SCREENSHOT REQUIRED|href="#"/);
});

test("How Tanee Works is discoverable through all public Marketing entry points", () => {
  const home = source("app/page.tsx");
  const features = source("app/features/page.tsx");
  const navigation = source("lib/marketing/public-navigation.ts");
  const footer = source("components/marketing/marketing-footer.tsx");
  const sitemap = source("app/sitemap.ts");
  const english = source("lib/i18n/locales/en/marketing.ts");
  const arabic = source("lib/i18n/locales/ar/marketing.ts");

  assert.match(home, /href="\/how-it-works"/);
  assert.match(features, /href="\/how-it-works"/);
  assert.match(navigation, /href: "\/how-it-works"/);
  assert.match(footer, /href="\/how-it-works"/);
  assert.match(sitemap, /publicSiteUrl\("\/how-it-works"\)/);
  assert.match(english, /"marketing\.navHowItWorks": "How it works"/);
  assert.match(arabic, /"marketing\.navHowItWorks": "كيف تعمل Tanee"/);
});
