import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection, type SupportedLocale } from "@/lib/i18n/config";
import {
  getMarketingAboutCopy,
  type AboutPrincipleId,
} from "@/lib/marketing/about";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { getPublicSupportChannels } from "@/lib/marketing/public-support-channels";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import type { Metadata } from "next";
import { Alexandria, Libre_Bodoni } from "next/font/google";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Mail,
  MessageCircle,
  Network,
  Phone,
  ReceiptText,
} from "lucide-react";

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

const principleIcons = {
  problem: ReceiptText,
  approach: Network,
  outcome: BadgeCheck,
} satisfies Record<AboutPrincipleId, typeof ReceiptText>;

const supportIcons = {
  email: Mail,
  whatsapp: MessageCircle,
  phone: Phone,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const pageCopy = getMarketingAboutCopy(locale);

  return {
    title: pageCopy.metaTitle,
    description: pageCopy.metaDescription,
    alternates: { canonical: "/about" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({
      title: pageCopy.metaTitle,
      description: pageCopy.metaDescription,
      path: "/about",
    }),
  };
}

function Eyebrow({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: SupportedLocale;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 shadow-sm">
      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      <span
        className={`text-[11px] font-black text-primary ${
          locale === "en" ? "uppercase tracking-[0.16em]" : ""
        }`}
      >
        {children}
      </span>
    </span>
  );
}

export default async function AboutPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const pageCopy = getMarketingAboutCopy(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const supportChannels = getPublicSupportChannels();
  const editorialClass =
    locale === "en" ? "font-[var(--font-marketing-editorial)]" : "";

  return (
    <main
      lang={locale}
      dir={direction}
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

      <section className="border-b border-border px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-5xl text-center">
          <Eyebrow locale={locale}>{pageCopy.eyebrow}</Eyebrow>
          <h1
            className={`${editorialClass} mx-auto mt-6 max-w-5xl text-balance text-4xl font-black leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-7xl ${locale === "en" ? "font-normal" : ""}`}
          >
            {pageCopy.title}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-pretty text-base leading-8 text-foreground-muted sm:text-lg">
            {pageCopy.body}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/how-it-works"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {pageCopy.primaryCta}
              <ArrowUpRight
                className="size-4 rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-6 py-3 font-bold transition-colors hover:border-primary/45 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {pageCopy.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 rounded-[1.75rem] border border-border bg-white p-6 shadow-[var(--lf-shadow-raised)] sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:p-14">
          <div>
            <Eyebrow locale={locale}>{pageCopy.whoEyebrow}</Eyebrow>
            <h2
              className={`${editorialClass} mt-6 text-3xl font-black leading-tight tracking-[-0.025em] sm:text-4xl lg:text-5xl ${locale === "en" ? "font-normal" : ""}`}
            >
              {pageCopy.whoTitle}
            </h2>
            <div className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--lf-primary-soft)] px-4 py-3 text-sm font-bold text-primary">
              <BadgeCheck className="size-5" aria-hidden="true" />
              {pageCopy.availability}
            </div>
          </div>
          <div className="space-y-5 self-center text-base leading-8 text-foreground-muted">
            {pageCopy.whoParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow locale={locale}>{pageCopy.whyEyebrow}</Eyebrow>
            <h2
              className={`${editorialClass} mt-6 text-balance text-3xl font-black leading-tight tracking-[-0.025em] sm:text-4xl lg:text-5xl ${locale === "en" ? "font-normal" : ""}`}
            >
              {pageCopy.whyTitle}
            </h2>
            <p className="mt-5 text-pretty leading-8 text-foreground-muted">
              {pageCopy.whyBody}
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {pageCopy.principles.map((principle, index) => {
              const Icon = principleIcons[principle.id];
              return (
                <article
                  key={principle.id}
                  className="flex min-h-72 min-w-0 flex-col rounded-[1.5rem] border border-border bg-[var(--lf-marketing-canvas)] p-6 transition-[border-color,transform,box-shadow] hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--lf-shadow-raised)] sm:p-8"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex size-12 items-center justify-center rounded-2xl border border-border bg-white text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span
                      dir="ltr"
                      className="text-xs font-black text-foreground-subtle"
                    >
                      0{index + 1}
                    </span>
                  </div>
                  <p
                    className={`mt-6 text-xs font-black text-primary ${locale === "en" ? "uppercase tracking-[0.14em]" : ""}`}
                  >
                    {principle.label}
                  </p>
                  <h3 className="mt-3 text-xl font-black leading-8">
                    {principle.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-foreground-muted">
                    {principle.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
        aria-labelledby="about-contact-title"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow locale={locale}>{pageCopy.contactEyebrow}</Eyebrow>
            <h2
              id="about-contact-title"
              className={`${editorialClass} mt-6 text-3xl font-black leading-tight tracking-[-0.025em] sm:text-4xl ${locale === "en" ? "font-normal" : ""}`}
            >
              {pageCopy.contactTitle}
            </h2>
            <p className="mt-4 leading-8 text-foreground-muted">
              {pageCopy.contactBody}
            </p>
          </div>
          <div
            className={`mx-auto mt-10 grid gap-4 ${supportChannels.length >= 3 ? "max-w-4xl md:grid-cols-3" : "max-w-3xl md:grid-cols-2"}`}
          >
            {supportChannels.map((channel) => {
              const Icon = supportIcons[channel.kind];
              const external = channel.kind === "whatsapp";
              return (
                <a
                  key={channel.kind}
                  href={channel.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className="group flex min-h-36 min-w-0 flex-col items-center justify-center rounded-2xl border border-border bg-white p-6 text-center transition-[border-color,transform,box-shadow] hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--lf-shadow-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="flex size-12 items-center justify-center rounded-full border border-border bg-[var(--lf-marketing-canvas)] text-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="mt-4 text-sm font-black">
                    {pageCopy.contactLabels[channel.kind]}
                  </span>
                  <span
                    dir="ltr"
                    className="mt-1 max-w-full break-all text-sm font-semibold text-foreground-muted group-hover:text-primary"
                  >
                    {channel.displayValue}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
        <div className="mx-auto grid max-w-6xl gap-8 overflow-hidden rounded-[1.75rem] bg-[linear-gradient(120deg,#1f1d1c_0%,#1f1d1c_58%,#4a2925_100%)] p-7 text-[#fff9f5] shadow-[var(--lf-shadow-raised)] sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end lg:p-14">
          <div className="max-w-3xl">
            <p
              className={`text-xs font-black text-[#ff806f] ${locale === "en" ? "uppercase tracking-[0.16em]" : ""}`}
            >
              {pageCopy.finalEyebrow}
            </p>
            <h2
              className={`${editorialClass} mt-4 text-balance text-3xl font-black leading-tight tracking-[-0.025em] sm:text-4xl lg:text-5xl ${locale === "en" ? "font-normal" : ""}`}
            >
              {pageCopy.finalTitle}
            </h2>
            <p className="mt-5 max-w-2xl leading-8 text-[#c7bfba]">
              {pageCopy.finalBody}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-stretch">
            <Link
              href="/get-started"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ff6652] px-6 py-3 font-bold text-white transition-colors hover:bg-[#e85745] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {pageCopy.finalCta}
              <ArrowUpRight
                className="size-4 rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
            <p className="text-xs font-semibold text-[#c7bfba]">
              {pageCopy.trialNote}
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
