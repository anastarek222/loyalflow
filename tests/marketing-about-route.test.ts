import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("About Tanee implements the complete bilingual Stitch structure", () => {
  const page = source("app/about/page.tsx");
  const pageCopy = source("lib/marketing/about.ts");

  assert.match(page, /getMarketingAboutCopy/);
  assert.match(page, /whoParagraphs\.map/);
  assert.match(page, /principles\.map/);
  assert.match(page, /getPublicSupportChannels\(\)/);
  assert.match(page, /href="\/how-it-works"/);
  assert.match(page, /href="\/contact"/);
  assert.match(page, /href="\/get-started"/);
  assert.match(page, /<MarketingHeader/);
  assert.match(page, /<MarketingFooter locale=\{locale\} \/>/);
  assert.match(page, /rtl:-scale-x-100/);

  for (const principle of ["problem", "approach", "outcome"]) {
    assert.match(pageCopy, new RegExp(`id: "${principle}"`));
  }
});

test("About Tanee uses current trial and contact truth", () => {
  const page = source("app/about/page.tsx");
  const pageCopy = source("lib/marketing/about.ts");
  const identity = source("lib/marketing/owner-public-identity.ts");

  assert.match(pageCopy, /MARKETING_ABOUT_TRIAL_DAYS = 14/);
  assert.match(pageCopy, /14 days free/);
  assert.match(pageCopy, /14 يومًا مجانًا/);
  assert.doesNotMatch(pageCopy, /7 days free|7 أيام مجانًا/i);
  assert.doesNotMatch(pageCopy, /Middle East|United States|Canada/i);
  assert.match(identity, /tanee\.eg\.loyalty@gmail\.com/);
  assert.match(identity, /\+17166571813/);
  assert.match(identity, /\+201212312746/);
  assert.doesNotMatch(page, /href="#"|SCREENSHOT REQUIRED|APPROVED TANEE/);
});

test("About Tanee is indexable and discoverable", () => {
  const page = source("app/about/page.tsx");
  const navigation = source("lib/marketing/public-navigation.ts");
  const footer = source("components/marketing/marketing-footer.tsx");
  const sitemap = source("app/sitemap.ts");

  assert.match(page, /alternates: \{ canonical: "\/about" \}/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /buildPublicSocialMetadata/);
  assert.match(navigation, /href: "\/about"/);
  assert.match(footer, /href="\/about"/);
  assert.match(sitemap, /publicSiteUrl\("\/about"\)/);
});
