import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";

type MarketingTranslationKey = Parameters<typeof translate>[1];
type PublicMarketingFooterGroup = "product" | "brand" | "support";

const PUBLIC_MARKETING_ROUTES = [
  {
    href: "/",
    labelKey: "marketing.navHome",
    footerGroup: "product",
  },
  {
    href: "/features",
    labelKey: "marketing.navFeatures",
    footerGroup: "product",
  },
  {
    href: "/how-it-works",
    labelKey: "marketing.navHowItWorks",
    footerGroup: "product",
  },
  {
    href: "/pricing",
    labelKey: "marketing.navPricing",
    footerGroup: "product",
  },
  {
    href: "/about",
    labelKey: "marketing.navAbout",
    footerGroup: "brand",
  },
  {
    href: "/faq",
    labelKey: "marketing.navFaq",
    footerGroup: "support",
  },
  {
    href: "/contact",
    labelKey: "marketing.navContact",
    footerGroup: "brand",
  },
] as const satisfies ReadonlyArray<{
  href: string;
  labelKey: MarketingTranslationKey;
  footerGroup: PublicMarketingFooterGroup;
}>;

export type PublicMarketingNavigationItem = {
  href: string;
  label: string;
};

function localizeMarketingRoute(
  locale: SupportedLocale,
  route: (typeof PUBLIC_MARKETING_ROUTES)[number],
): PublicMarketingNavigationItem {
  if (route.href === "/about") {
    return {
      href: route.href,
      label: locale === "ar" ? "عن Tanee" : "About Tanee",
    };
  }

  return {
    href: route.href,
    label: translate(locale, route.labelKey),
  };
}

export function getPublicMarketingNavigation(locale: SupportedLocale) {
  return PUBLIC_MARKETING_ROUTES.map((route) =>
    localizeMarketingRoute(locale, route),
  );
}

export function getPublicMarketingFooterNavigation(locale: SupportedLocale) {
  const groups: Record<
    PublicMarketingFooterGroup,
    PublicMarketingNavigationItem[]
  > = {
    product: [],
    brand: [],
    support: [],
  };

  for (const route of PUBLIC_MARKETING_ROUTES) {
    groups[route.footerGroup].push(localizeMarketingRoute(locale, route));
  }

  groups.support.unshift({
    href: "/security",
    label: locale === "ar" ? "الأمان والخصوصية" : "Security & Privacy",
  });

  return groups;
}
