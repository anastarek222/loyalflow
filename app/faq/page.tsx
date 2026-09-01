import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const title = translate(locale, "marketing.faq.metaTitle");
  const description = translate(locale, "marketing.faq.metaDescription");
  return {
    title,
    description,
    alternates: { canonical: "/faq" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({ title, description, path: "/faq" }),
  };
}

export default async function FaqPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const questions = [
    ["marketing.faqOneQuestion", "marketing.faqOneAnswer"],
    ["marketing.faqTwoQuestion", "marketing.faqTwoAnswer"],
    ["marketing.faqThreeQuestion", "marketing.faqThreeAnswer"],
    ["marketing.faq.fourQuestion", "marketing.faq.fourAnswer"],
    ["marketing.faq.fiveQuestion", "marketing.faq.fiveAnswer"],
    ["marketing.faq.sixQuestion", "marketing.faq.sixAnswer"],
  ] as const;
  return (
    <main
      lang={locale}
      dir={direction}
      className="min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] text-foreground [overflow-wrap:anywhere]"
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
      <section className="border-b border-border bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-5xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
            {copy("marketing.faq.pageEyebrow")}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            {copy("marketing.faq.pageTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-foreground-muted">
            {copy("marketing.faq.pageBody")}
          </p>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto w-full max-w-4xl divide-y divide-border border-y border-border bg-white px-5 sm:px-8">
          {questions.map(([questionKey, answerKey], index) => (
            <details
              key={questionKey}
              className="group py-3"
              open={index === 0}
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-black marker:content-none">
                <span>{copy(questionKey)}</span>
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="max-w-3xl pb-6 text-sm leading-7 text-foreground-muted">
                {copy(answerKey)}
              </p>
            </details>
          ))}
        </div>
      </section>
      <MarketingFooter locale={locale} />
    </main>
  );
}
