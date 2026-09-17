import { marketingMessagesAr } from "./locales/ar/marketing";
import { marketingMessagesEn } from "./locales/en/marketing";

const arParity: Record<keyof typeof marketingMessagesEn, string> =
  marketingMessagesAr;
const enParity: Record<keyof typeof marketingMessagesAr, string> =
  marketingMessagesEn;

const ARABIC_AGAIN_KEYS = new Set<keyof typeof marketingMessagesEn>([
  "marketing.home.heroTitle",
  "marketing.home.problemTitle",
  "marketing.home.finalTitle",
  "marketing.faq.item9Question",
]);

const normalizedArabicMarketing = Object.fromEntries(
  Object.entries(arParity).map(([rawKey, value]) => {
    const key = rawKey as keyof typeof marketingMessagesEn;
    if (key === "marketing.navAbout") {
      return [key, "عن Tanee"];
    }
    if (ARABIC_AGAIN_KEYS.has(key)) {
      return [key, value];
    }
    return [key, value.split("تاني").join("Tanee")];
  }),
) as Record<keyof typeof marketingMessagesEn, string>;

export const marketingMessages = {
  en: enParity,
  ar: normalizedArabicMarketing,
} as const;
