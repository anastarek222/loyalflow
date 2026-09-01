import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getMarketingDemoEmbedUrl } from "@/lib/marketing/demo-media";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DemoPage() {
  const embedUrl = getMarketingDemoEmbedUrl();
  if (!embedUrl) notFound();

  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const navigation = getPublicMarketingNavigation(locale);
  const title = locale === "ar" ? "عرض تاني" : "Tanee demo";

  return (
    <main
      lang={locale}
      dir={direction}
      className="min-h-screen bg-[var(--lf-marketing-canvas)] text-foreground"
    >
      <MarketingHeader
        locale={locale}
        brand={translate(locale, "common.brand")}
        signIn={translate(locale, "auth.signIn")}
        primaryCta={translate(locale, "marketing.primaryCta")}
        menuLabel={translate(locale, "marketing.menuOpen")}
        closeLabel={translate(locale, "marketing.menuClose")}
        navigation={navigation}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-border bg-black shadow-[var(--lf-shadow-raised)]">
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                title={title}
                className="size-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
