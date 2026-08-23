import type { SupportedLocale } from "@/lib/i18n/config";
import { platformBrand } from "@/lib/platform-brand";
import { PUBLIC_SITE_URL } from "@/lib/urls/public-site-url";

type PublicWebsiteStructuredDataInput = {
  description: string;
  locale: SupportedLocale;
};

export function buildPublicWebsiteStructuredData({
  description,
  locale,
}: PublicWebsiteStructuredDataInput) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: platformBrand.name,
    url: PUBLIC_SITE_URL,
    description,
    inLanguage: locale,
  } as const;
}
