import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("T006 public homepage keeps authenticated users on the workspace and logged-out users on marketing", () => {
  const page = source("app/page.tsx");

  assert.match(page, /if \(session\?\.user\) redirect\("\/dashboard"\)/);
  assert.doesNotMatch(
    page,
    /redirect\(session\?\.user \? "\/dashboard" : "\/login"\)/,
  );
  assert.match(page, /href="\/login"/);
  assert.match(page, /href="\/accept-owner-invitation"/);
});

test("T006 marketing homepage reuses the canonical locale cookie and direction helpers", () => {
  const page = source("app/page.tsx");
  const header = source("components/marketing/marketing-header.tsx");

  assert.match(page, /LOCALE_COOKIE_NAME/);
  assert.match(page, /resolveRequestLocale/);
  assert.match(page, /getLocaleDirection/);
  assert.match(page, /<main\s+lang=\{locale\}\s+dir=\{direction\}/);
  assert.match(page, /<MarketingHeader\s+locale=\{locale\}/);
  assert.match(header, /<LanguageSwitcher locale=\{locale\}/);
});

test("T006 marketing copy stays in the canonical bilingual catalog", () => {
  const catalog = source("lib/i18n/catalog.ts");
  const english = source("lib/i18n/locales/en/marketing.ts");
  const arabic = source("lib/i18n/locales/ar/marketing.ts");

  assert.match(catalog, /import \{ marketingMessages \} from "\.\/marketing"/);
  assert.match(catalog, /\.\.\.marketingMessages\.en/);
  assert.match(catalog, /\.\.\.marketingMessages\.ar/);

  for (const key of [
    "marketing.metaTitle",
    "marketing.metaDescription",
    "marketing.heroTitle",
    "marketing.heroBody",
    "marketing.primaryCta",
    "marketing.featureOneTitle",
    "marketing.featureTwoTitle",
    "marketing.featureThreeTitle",
    "marketing.workflowTitle",
  ]) {
    const englishOccurrences = english.split(`\"${key}\"`).length - 1;
    const arabicOccurrences = arabic.split(`\"${key}\"`).length - 1;
    assert.equal(englishOccurrences, 1, `${key} should exist once in English`);
    assert.equal(arabicOccurrences, 1, `${key} should exist once in Arabic`);
  }
});

test("T006 public homepage exposes localized indexable metadata without a provider dependency", () => {
  const page = source("app/page.tsx");

  assert.match(
    page,
    /export async function generateMetadata\(\): Promise<Metadata>/,
  );
  assert.match(page, /title: translate\(locale, "marketing\.metaTitle"\)/);
  assert.match(
    page,
    /description: translate\(locale, "marketing\.metaDescription"\)/,
  );
  assert.match(page, /alternates: \{ canonical: "\/" \}/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.doesNotMatch(page, /googleAnalytics|gtag|segment|mixpanel|posthog/i);
});

test("T006 first slice does not invent signup, payment, analytics provider, or database work", () => {
  const contract = source("docs/T006_MARKETING_ONBOARDING_CONTRACT.md");
  const page = source("app/page.tsx");

  assert.match(contract, /No public self-service account creation/);
  assert.match(contract, /No payment or subscription checkout/);
  assert.match(contract, /No analytics provider or tracking SDK/);
  assert.match(
    contract,
    /No database schema, migration, seed, backfill, or data command/,
  );
  assert.doesNotMatch(page, /signup|checkout|stripe|analytics/i);
});
