import { marketingMessagesAr } from "./locales/ar/marketing";
import { marketingMessagesEn } from "./locales/en/marketing";

const arParity: Record<keyof typeof marketingMessagesEn, string> =
  marketingMessagesAr;
const enParity: Record<keyof typeof marketingMessagesAr, string> =
  marketingMessagesEn;

const ARABIC_BRAND_NAME_KEYS = new Set<keyof typeof marketingMessagesEn>([
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
]);

const normalizedArabicMarketing = Object.fromEntries(
  Object.entries(arParity).map(([rawKey, value]) => {
    const key = rawKey as keyof typeof marketingMessagesEn;
    if (key === "marketing.navAbout") {
      return [key, "عن Tanee"];
    }
    if (ARABIC_BRAND_NAME_KEYS.has(key)) {
      return [key, value.split("تاني").join("Tanee")];
    }
    return [key, value];
  }),
) as Record<keyof typeof marketingMessagesEn, string>;

export const marketingMessages = {
  en: enParity,
  ar: normalizedArabicMarketing,
} as const;
