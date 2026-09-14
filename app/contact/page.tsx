import { ContactSalesExperience } from "@/components/marketing/contact-sales-experience";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { getPublicSupportChannels } from "@/lib/marketing/public-support-channels";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import type { Metadata } from "next";

import styles from "./contact-booking.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const title = translate(locale, "marketing.contact.metaTitle");
  const description = translate(locale, "marketing.contact.metaDescription");

  return {
    title,
    description,
    alternates: { canonical: "/contact" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({ title, description, path: "/contact" }),
  };
}

export default async function ContactPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const supportChannels = getPublicSupportChannels();

  return (
    <main
      lang={locale}
      dir={direction}
      className={`${styles.bookingExperience} lf-marketing-surface min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] font-[var(--font-marketing-sans)] text-foreground [overflow-wrap:anywhere]`}
    >
      <MarketingHeader
        locale={locale}
        brand={copy("common.brand")}
        signIn={copy("auth.signIn")}
        primaryCta={copy("marketing.primaryCta")}
        menuLabel={copy("marketing.menuOpen")}
        closeLabel={copy("marketing.menuClose")}
        navigation={getPublicMarketingNavigation(locale)}
      />

      <ContactSalesExperience
        locale={locale}
        supportChannels={supportChannels}
      />

      <MarketingFooter locale={locale} />
    </main>
  );
}
