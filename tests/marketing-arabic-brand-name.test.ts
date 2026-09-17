import assert from "node:assert/strict";
import test from "node:test";

import { marketingMessages } from "../lib/i18n/marketing";

const brandNameKeys = [
  "marketing.metaTitle",
  "marketing.heroBody",
  "marketing.previewLabel",
  "marketing.securityBody",
  "marketing.faqTwoAnswer",
  "marketing.faqThreeQuestion",
  "marketing.features.metaTitle",
  "marketing.features.metaDescription",
  "marketing.features.ctaBody",
  "marketing.pricing.metaTitle",
  "marketing.about.metaTitle",
  "marketing.about.metaDescription",
  "marketing.about.eyebrow",
  "marketing.about.body",
  "marketing.contact.metaTitle",
  "marketing.contact.metaDescription",
  "marketing.contact.title",
  "marketing.contact.setupBody",
  "marketing.contact.noticeBody",
  "marketing.privacy.metaTitle",
  "marketing.privacy.metaDescription",
  "marketing.privacy.title",
  "marketing.privacy.dataBody",
  "marketing.privacy.useBody",
  "marketing.privacy.choicesBody",
  "marketing.terms.metaTitle",
  "marketing.terms.metaDescription",
  "marketing.terms.title",
  "marketing.terms.accessBody",
  "marketing.terms.loyaltyBody",
  "marketing.terms.useBody",
] as const;

const naturalAgainKeys = [
  "marketing.home.heroTitle",
  "marketing.home.problemTitle",
  "marketing.home.finalTitle",
  "marketing.faq.item9Question",
] as const;

test("Arabic marketing keeps the Tanee product name in English", () => {
  for (const key of brandNameKeys) {
    assert.match(marketingMessages.ar[key], /Tanee/, key);
    assert.doesNotMatch(marketingMessages.ar[key], /تاني/, key);
  }

  assert.equal(marketingMessages.ar["marketing.navAbout"], "عن Tanee");
});

test("Arabic natural-language uses of تاني remain Arabic", () => {
  for (const key of naturalAgainKeys) {
    assert.match(marketingMessages.ar[key], /تاني/, key);
  }
});
