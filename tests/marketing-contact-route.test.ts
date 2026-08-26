import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Contact provides truthful beta access paths without invented channels", () => {
  const page = source("app/contact/page.tsx");

  assert.match(page, /alternates: \{ canonical: "\/contact" \}/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /getMarketingRequestLocale\(\)/);
  assert.match(page, /href: "\/get-started"/);
  assert.match(page, /href: "\/login"/);
  assert.match(page, /href: "\/accept-owner-invitation"/);
  assert.match(page, /<MarketingHeader/);
  assert.match(page, /<MarketingFooter locale=\{locale\} \/>/);
  assert.doesNotMatch(page, /mailto:|wa\.me|<form/i);
});

test("Contact is discoverable from navigation, footer, and sitemap", () => {
  assert.match(
    source("lib/marketing/public-navigation.ts"),
    /href: "\/contact"/,
  );
  assert.match(
    source("components/marketing/marketing-footer.tsx"),
    /href="\/contact"/,
  );
  assert.match(source("app/sitemap.ts"), /publicSiteUrl\("\/contact"\)/);
});

test("Contact copy has matching Arabic and English keys", () => {
  const english = source("lib/i18n/locales/en/marketing.ts");
  const arabic = source("lib/i18n/locales/ar/marketing.ts");
  const keys = [...english.matchAll(/"(marketing\.contact\.[^"]+)":/g)].map(
    ([, key]) => key,
  );

  assert.ok(keys.length >= 10);
  for (const key of keys) assert.match(arabic, new RegExp(`"${key}":`));
});
