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
    /className="lf-marketing-surface fixed inset-y-0 right-0/,
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
  const brandRenderer = source(
    "components/marketing/marketing-brand-text.tsx",
  );

  assert.match(identity, /data-platform-brand-wordmark-size/);
  assert.match(header, /showMark=\{false\}/);
  assert.match(header, /wordmarkSize="marketing"/);
  assert.match(footer, /wordmarkSize="marketing-footer"/);
  assert.match(styles, /wordmark-size="compact"/);
  assert.match(brandRenderer, /InlineTaneeName/);
  assert.doesNotMatch(brandRenderer, /data-marketing-inline-wordmark/);
  assert.match(styles, /inline-size:\s*3\.515625em/);
  assert.match(styles, /block-size:\s*0\.9em/);
  assert.match(styles, /wordmark-size="compact"[\s\S]*?block-size:\s*100%/);
  assert.match(styles, /wordmark-size="marketing"/);
  assert.match(styles, /block-size:\s*1\.75rem/);
  assert.match(header, /themeAdaptiveWordmark/);
  assert.match(styles, /wordmark-theme="dark"/);
  assert.match(
    styles,
    /\.lf-marketing-surface \[data-platform-brand-wordmark-theme="dark"\]\s*\{\s*display: none;/,
  );
  assert.match(
    styles,
    /html\[data-marketing-theme="dark"\][\s\S]*?\[data-platform-brand-wordmark-theme="light"\]\s*\{\s*opacity: 0;/,
  );
  assert.doesNotMatch(
    styles,
    /html\[data-marketing-theme="dark"\][\s\S]*?\[data-platform-brand-wordmark-theme="light"\]\s*\{\s*display: none;/,
  );
  assert.match(
    source("public/brand/tanee-wordmark-en-dark.svg"),
    /fill="#FFF9F5"/,
  );
});


test("desktop marketing shell keeps fixed brand, navigation, and action lanes", () => {
  const header = source("components/marketing/marketing-header.tsx");
  const footer = source("components/marketing/marketing-footer.tsx");

  assert.match(header, /data-marketing-header-brand="true"/);
  assert.match(header, /data-marketing-header-nav="true"/);
  assert.match(header, /data-marketing-header-actions="true"/);
  assert.match(
    header,
    /min-\[1366px\]:grid-cols-\[8rem_minmax\(0,1fr\)_31rem\]/,
  );
  assert.match(
    header,
    /min-\[1366px\]:grid-cols-\[4\.5rem_5rem_6\.25rem_4\.5rem_6\.5rem_8rem_6rem\]/,
  );
  assert.match(header, /min-\[1366px\]:justify-between/);
  assert.match(header, /min-\[1366px\]:w-full/);
  assert.match(header, /data-marketing-header-theme-slot="true"/);
  assert.match(header, /data-marketing-header-language-slot="true"/);
  assert.match(header, /data-marketing-header-signin-slot="true"/);
  assert.match(header, /data-marketing-header-cta-slot="true"/);
  assert.match(header, /w-\[7\.5rem\] items-center justify-center/);
  assert.match(header, /w-\[13\.5rem\] items-center justify-center/);

  assert.match(footer, /data-marketing-footer-shell="true"/);
  assert.match(footer, /data-marketing-footer-brand="true"/);
  assert.match(footer, /data-marketing-footer-navigation="true"/);
  assert.match(footer, /data-marketing-footer-actions="true"/);
  assert.match(footer, /data-marketing-footer-theme-slot="true"/);
  assert.match(footer, /data-marketing-footer-language-slot="true"/);
  assert.match(footer, /data-marketing-footer-access-slot="true"/);
  assert.match(
    footer,
    /lg:grid-cols-\[20rem_minmax\(0,1fr\)\]/,
  );
  assert.match(
    footer,
    /md:grid-cols-\[minmax\(0,1fr\)_22rem\]/,
  );
});

test("all marketing routes with Tanee copy use the canonical inline brand renderer", () => {
  for (const route of [
    "app/page.tsx",
    "app/features/page.tsx",
    "app/how-it-works/page.tsx",
    "app/pricing/page.tsx",
    "app/about/page.tsx",
    "app/faq/page.tsx",
    "app/security/page.tsx",
    "app/data-deletion/page.tsx",
    "app/get-started/page.tsx",
    "app/demo/page.tsx",
  ]) {
    assert.match(source(route), /MarketingBrandText/);
  }

  assert.match(
    source("components/marketing/contact-sales-experience.tsx"),
    /MarketingBrandText/,
  );
  assert.match(
    source("components/marketing/legal-document-page.tsx"),
    /MarketingBrandText/,
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


test("all public marketing routes inherit the canonical header, footer, and brand renderer", () => {
  const routes = [
    "app/page.tsx",
    "app/features/page.tsx",
    "app/pricing/page.tsx",
    "app/how-it-works/page.tsx",
    "app/about/page.tsx",
    "app/faq/page.tsx",
    "app/contact/page.tsx",
    "app/security/page.tsx",
    "app/privacy/page.tsx",
    "app/terms/page.tsx",
    "app/data-deletion/page.tsx",
    "app/demo/page.tsx",
    "app/get-started/page.tsx",
  ];

  for (const route of routes) {
    const routeSource = source(route);
    if (route === "app/terms/page.tsx") {
      assert.match(routeSource, /<LegalDocumentPage/);
    } else {
      assert.match(routeSource, /<MarketingHeader/);
      assert.match(routeSource, /<MarketingFooter/);
    }
  }

  const legalDocument = source(
    "components/marketing/legal-document-page.tsx",
  );
  assert.match(legalDocument, /<MarketingHeader/);
  assert.match(legalDocument, /<MarketingFooter/);

  const brandRenderer = source(
    "components/marketing/marketing-brand-text.tsx",
  );
  const header = source("components/marketing/marketing-header.tsx");
  const footer = source("components/marketing/marketing-footer.tsx");

  assert.match(brandRenderer, /split\(\/\(Tanee\)\/g\)/);
  assert.match(brandRenderer, /<InlineTaneeName/);
  assert.doesNotMatch(brandRenderer, /wordmarkSize="compact"/);
  assert.match(header, /<MarketingBrandText text=\{item\.label\}/);
  assert.match(footer, /<MarketingBrandText text="Tanee"/);
  assert.match(footer, /marketing\.footerRights/);
});
