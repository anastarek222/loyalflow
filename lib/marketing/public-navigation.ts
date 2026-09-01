import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";

export function getPublicMarketingNavigation(locale: SupportedLocale) {
  return [
    { href: "/", label: translate(locale, "marketing.navHome") },
    { href: "/features", label: translate(locale, "marketing.navFeatures") },
    { href: "/pricing", label: translate(locale, "marketing.navPricing") },
    { href: "/about", label: translate(locale, "marketing.navAbout") },
    { href: "/faq", label: translate(locale, "marketing.navFaq") },
    { href: "/contact", label: translate(locale, "marketing.navContact") },
  ] as const;
}
