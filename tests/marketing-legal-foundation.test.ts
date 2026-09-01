import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getPublicLegalProfile } from "../lib/legal/public-legal-profile";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("legal publication fails closed until every approved field is valid", () => {
  assert.equal(getPublicLegalProfile({}).isPublished, false);
  assert.equal(
    getPublicLegalProfile({
      NEXT_PUBLIC_LEGAL_PUBLICATION_STATUS: "published",
      NEXT_PUBLIC_LEGAL_ENTITY_NAME: "LoyalFlow Operator",
      NEXT_PUBLIC_LEGAL_COUNTRY: "Egypt",
      NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: "not-an-email",
      NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE: "2026-08-26",
    }).isPublished,
    false,
  );

  assert.deepEqual(
    getPublicLegalProfile({
      NEXT_PUBLIC_LEGAL_PUBLICATION_STATUS: "published",
      NEXT_PUBLIC_LEGAL_ENTITY_NAME: " LoyalFlow Operator ",
      NEXT_PUBLIC_LEGAL_COUNTRY: " Egypt ",
      NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: " LEGAL@LOYALFLOW.EXAMPLE ",
      NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE: "2026-08-26",
    }),
    {
      entityName: "LoyalFlow Operator",
      country: "Egypt",
      contactEmail: "legal@loyalflow.example",
      effectiveDate: "2026-08-26",
      isPublished: true,
    },
  );
});

test("Privacy and Terms remain noindex drafts until legal publication", () => {
  for (const route of ["privacy", "terms"]) {
    const page = source(`app/${route}/page.tsx`);
    assert.match(page, new RegExp(`canonical: "\\/${route}"`));
    assert.match(page, /getPublicLegalProfile\(\)/);
    assert.match(page, /profile\.isPublished/);
    assert.match(page, /index: false, follow: false/);
    assert.match(page, /<LegalDocumentPage/);
  }
});

test("legal routes are linked in the footer and gated in the sitemap", () => {
  const footer = source("components/marketing/marketing-footer.tsx");
  const sitemap = source("app/sitemap.ts");
  const environment = source(".env.example");

  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /href="\/terms"/);
  assert.match(sitemap, /getPublicLegalProfile\(\)\.isPublished/);
  assert.match(sitemap, /publicSiteUrl\("\/privacy"\)/);
  assert.match(sitemap, /publicSiteUrl\("\/terms"\)/);
  assert.match(environment, /NEXT_PUBLIC_LEGAL_PUBLICATION_STATUS="draft"/);
  assert.match(environment, /NEXT_PUBLIC_LEGAL_ENTITY_NAME=""/);
  assert.match(environment, /NEXT_PUBLIC_LEGAL_CONTACT_EMAIL=""/);
});

test("legal copy has matching Arabic and English keys", () => {
  const english = source("lib/i18n/locales/en/marketing.ts");
  const arabic = source("lib/i18n/locales/ar/marketing.ts");
  const keys = [
    ...english.matchAll(/"(marketing\.(?:legal|privacy|terms)\.[^"]+)":/g),
  ].map(([, key]) => key);

  assert.ok(keys.length >= 35);
  for (const key of keys) assert.match(arabic, new RegExp(`"${key}":`));
});
