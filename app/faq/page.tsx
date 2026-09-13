import { ChevronDown, Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { Alexandria, Libre_Bodoni } from "next/font/google";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { getPublicSupportChannels } from "@/lib/marketing/public-support-channels";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";

const marketingSans = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-marketing-sans",
  display: "swap",
});
const marketingEditorial = Libre_Bodoni({
  subsets: ["latin"],
  variable: "--font-marketing-editorial",
  display: "swap",
});

const groups = [
  {
    id: "getting-started",
    title: "marketing.faq.group1Title",
    items: [1, 2, 3],
  },
  {
    id: "running-your-programme",
    title: "marketing.faq.group2Title",
    items: [4, 5, 6],
  },
  {
    id: "customer-experience",
    title: "marketing.faq.group3Title",
    items: [7, 8, 9],
  },
] as const;

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
  const copy = (key: MessageKey) => translate(locale, key);
  const supportChannels = getPublicSupportChannels().filter(
    (channel) => channel.kind === "whatsapp" || channel.kind === "email",
  );
  const editorialClass =
    locale === "en"
      ? "font-[var(--font-marketing-editorial)] font-normal tracking-tight"
      : "font-semibold tracking-normal";

  return (
    <main
      lang={locale}
      dir={getLocaleDirection(locale)}
      className={`${marketingSans.variable} ${marketingEditorial.variable} lf-marketing-surface min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] font-[var(--font-marketing-sans)] text-foreground [overflow-wrap:anywhere]`}
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

      <section className="mx-auto max-w-[1240px] px-5 pb-10 pt-12 text-center md:px-8 md:pb-12 md:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold">
          <span
            className="size-1.5 rounded-full bg-primary"
            aria-hidden="true"
          />
          {copy("marketing.faq.pageEyebrow")}
        </p>
        <h1
          className={`${editorialClass} mx-auto mb-5 mt-6 max-w-3xl text-balance ${locale === "en" ? "text-[32px] leading-[1.25] md:text-5xl lg:text-[54px]" : "text-[30px] leading-[1.4] md:text-5xl lg:text-[52px]"}`}
        >
          {copy("marketing.faq.pageTitle")}
        </h1>
        <p className="mx-auto max-w-xl text-base leading-[1.7] text-foreground-muted md:text-lg">
          {copy("marketing.faq.pageBody")}
        </p>
      </section>

      <div className="mx-auto max-w-[800px] space-y-10 px-5 md:px-6">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={group.id}>
            <div className="mb-4 flex items-start gap-3 border-b border-border pb-3">
              <span
                className="mt-2.5 size-2 shrink-0 rounded-full bg-primary md:mt-3.5"
                aria-hidden="true"
              />
              <h2
                id={group.id}
                className="min-w-0 text-xl font-semibold leading-normal md:text-2xl"
              >
                {copy(group.title)}
              </h2>
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <details
                  key={item}
                  open={item === 1}
                  className="group rounded-2xl border border-border bg-surface p-4 shadow-sm md:p-6"
                >
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-start text-base font-semibold leading-relaxed marker:content-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground md:text-[17px] [&::-webkit-details-marker]:hidden">
                    <span>{copy(`marketing.faq.item${item}Question`)}</span>
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-[var(--lf-marketing-canvas)] text-foreground-muted transition-transform duration-200 group-open:rotate-180 group-hover:text-foreground motion-reduce:transition-none"
                      aria-hidden="true"
                    >
                      <ChevronDown className="size-4" />
                    </span>
                  </summary>
                  <p className="mt-2 border-t border-border pt-4 text-base leading-[1.7] text-foreground-muted">
                    {copy(`marketing.faq.item${item}Answer`)}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section
        aria-labelledby="faq-contact"
        className="mx-auto max-w-[800px] px-5 pb-16 pt-12 md:px-6 md:pb-20 md:pt-16"
      >
        <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 text-center md:flex-row md:items-center md:justify-between md:p-8 md:text-start">
          <div className="min-w-0">
            <h2
              id="faq-contact"
              className={`${editorialClass} text-2xl leading-normal`}
            >
              {copy("marketing.faq.contactTitle")}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-foreground-muted">
              {copy("marketing.faq.contactBody")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:justify-center">
            {supportChannels.map((channel) => {
              const isWhatsApp = channel.kind === "whatsapp";
              const Icon = isWhatsApp ? MessageCircle : Mail;
              return (
                <a
                  key={channel.kind}
                  href={channel.href}
                  target={isWhatsApp ? "_blank" : undefined}
                  rel={isWhatsApp ? "noopener noreferrer" : undefined}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-[var(--lf-marketing-canvas)] px-5 py-3 text-sm font-semibold transition-colors hover:border-foreground hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {copy(
                    isWhatsApp
                      ? "marketing.faq.whatsappLabel"
                      : "marketing.faq.emailLabel",
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </section>
      <MarketingFooter locale={locale} />
    </main>
  );
}
