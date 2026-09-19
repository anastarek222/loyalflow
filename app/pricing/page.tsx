import { MarketingBrandText } from "@/components/marketing/marketing-brand-text";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection, type SupportedLocale } from "@/lib/i18n/config";
import {
  getMarketingPricingCopy,
  type MarketingPricingPlan,
} from "@/lib/marketing/pricing";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import type { Metadata } from "next";
import { Alexandria, Libre_Bodoni } from "next/font/google";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ChevronDown,
  ContactRound,
  CreditCard,
  Gift,
  LineChart,
  Palette,
  SlidersHorizontal,
  Store,
  Zap,
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

const planIcons = {
  starter: Store,
  growth: LineChart,
  scale: Building2,
} as const;

const includedIcons = {
  brand: Palette,
  activity: LineChart,
  rewards: SlidersHorizontal,
  context: ContactRound,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const pricing = getMarketingPricingCopy(locale);

  return {
    title: pricing.metaTitle,
    description: pricing.metaDescription,
    alternates: { canonical: "/pricing" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({
      title: pricing.metaTitle,
      description: pricing.metaDescription,
      path: "/pricing",
    }),
  };
}

function PlanCard({
  locale,
  plan,
  index,
  editorial,
  cta,
  planLabel,
}: {
  locale: SupportedLocale;
  plan: MarketingPricingPlan;
  index: number;
  editorial: string;
  cta: string;
  planLabel: string;
}) {
  const Icon = planIcons[plan.id];

  return (
    <article
      className={`relative flex min-w-0 flex-col justify-between rounded-3xl bg-white p-7 transition duration-300 sm:p-8 lg:p-10 ${
        plan.featured
          ? "shadow-[var(--lf-shadow-raised)] lg:-translate-y-3"
          : "shadow-[var(--lf-shadow-soft)] hover:-translate-y-1 hover:shadow-[var(--lf-shadow-raised)]"
      }`}
    >
      {plan.featured && plan.popularLabel ? (
        <span className="absolute -top-3 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--lf-primary-foreground)] rtl:translate-x-1/2">
          <MarketingBrandText text={plan.popularLabel} />
        </span>
      ) : null}

      <div>
        <div className="flex items-center justify-between gap-4 pt-1">
          <span
            className={`text-[11px] font-black uppercase tracking-[0.14em] ${
              plan.featured ? "text-primary" : "text-foreground-muted"
            }`}
          >
            {planLabel} {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className={`flex size-9 items-center justify-center rounded-xl ${
              plan.featured
                ? "bg-[var(--lf-primary-soft)] text-primary"
                : "bg-surface-subtle text-foreground-muted"
            }`}
          >
            <Icon size={17} aria-hidden="true" />
          </span>
        </div>

        <h2 className={`mt-6 text-2xl font-semibold ${editorial}`}>
          <MarketingBrandText text={plan.name} />
        </h2>

        <div className="mt-3 flex min-h-16 flex-wrap items-baseline gap-x-2 gap-y-1">
          {locale === "en" ? (
            <span className={`text-2xl font-semibold ${editorial}`}>
              {plan.currency}
            </span>
          ) : null}
          <span
            className={`text-4xl font-semibold tracking-tight ${editorial}`}
          >
            {plan.price}
          </span>
          {locale === "ar" ? (
            <span className="text-sm font-bold text-foreground-muted">
              {plan.currency}
            </span>
          ) : null}
          <span className="text-sm font-medium text-foreground-muted">
            {plan.cadence}
          </span>
        </div>

        <p className="mt-5 min-h-24 text-sm leading-7 text-foreground-muted">
          <MarketingBrandText text={plan.body} />
        </p>
      </div>

      <Link
        href="/get-started"
        className={`mt-8 inline-flex min-h-[52px] items-center justify-center rounded-2xl px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] focus-visible:ring-offset-2 ${
          plan.featured
            ? "bg-primary text-[var(--lf-primary-foreground)] hover:bg-primary-hover"
            : "bg-surface-subtle text-foreground hover:text-primary"
        }`}
      >
        <MarketingBrandText text={cta} />
      </Link>
    </article>
  );
}

export default async function PricingPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const t = (key: MessageKey) => translate(locale, key);
  const navigation = getPublicMarketingNavigation(locale);
  const pricing = getMarketingPricingCopy(locale);
  const editorial =
    locale === "en"
      ? "[font-family:var(--font-marketing-editorial)]"
      : "[font-family:var(--font-marketing-sans)]";

  return (
    <main
      lang={locale}
      dir={direction}
      className={`${marketingSans.variable} ${marketingEditorial.variable} lf-marketing-surface min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] text-foreground [font-family:var(--font-marketing-sans)] [overflow-wrap:anywhere]`}
    >
      <MarketingHeader
        locale={locale}
        brand={t("common.brand")}
        signIn={t("auth.signIn")}
        primaryCta={t("marketing.primaryCta")}
        menuLabel={t("marketing.menuOpen")}
        closeLabel={t("marketing.menuClose")}
        navigation={navigation}
      />

      <section className="px-5 pb-10 pt-16 text-center sm:px-8 lg:px-20 lg:pb-16 lg:pt-24">
        <div className="mx-auto w-full max-w-[1240px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-primary shadow-[var(--lf-shadow-soft)]">
            <span className="size-1.5 rounded-full bg-primary" />
            <MarketingBrandText text={pricing.eyebrow} />
          </span>
          <h1
            className={`mx-auto mt-6 max-w-4xl text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl ${editorial}`}
          >
            <MarketingBrandText text={pricing.title} />
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-foreground-muted sm:text-lg">
            <MarketingBrandText text={pricing.body} />
          </p>

          <div className="mx-auto mt-8 grid max-w-3xl gap-3 rounded-2xl border border-border bg-white p-4 text-sm font-semibold text-foreground-muted shadow-[var(--lf-shadow-soft)] sm:grid-cols-3 sm:rounded-full sm:px-6">
            <span className="inline-flex items-center justify-center gap-2">
              <BadgeCheck
                size={18}
                className="text-primary"
                aria-hidden="true"
              />
              <MarketingBrandText text={pricing.proofTrial} />
            </span>
            <span className="inline-flex items-center justify-center gap-2 sm:border-x sm:border-border sm:px-4">
              <CreditCard
                size={18}
                className="text-primary"
                aria-hidden="true"
              />
              <MarketingBrandText text={pricing.proofPayment} />
            </span>
            <span className="inline-flex items-center justify-center gap-2">
              <Zap size={18} className="text-primary" aria-hidden="true" />
              <MarketingBrandText text={pricing.proofSetup} />
            </span>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-20 lg:py-16">
        <div className="mx-auto grid w-full max-w-[1240px] gap-8 lg:grid-cols-3 lg:items-stretch">
          {pricing.plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              locale={locale}
              plan={plan}
              index={index}
              editorial={editorial}
              cta={pricing.cta}
              planLabel={pricing.planLabel}
            />
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-6 text-foreground-muted sm:text-sm">
          <MarketingBrandText text={pricing.planFootnote} />
        </p>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-20 lg:py-24">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              <MarketingBrandText text={pricing.includedEyebrow} />
            </p>
            <h2
              className={`mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl ${editorial}`}
            >
              <MarketingBrandText text={pricing.includedTitle} />
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {pricing.included.map((item) => {
              const Icon = includedIcons[item.id];
              return (
                <article
                  key={item.id}
                  className="min-h-60 rounded-3xl border border-border bg-white p-6 shadow-[var(--lf-shadow-soft)] sm:p-7"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <h3
                    className={`mt-7 text-lg font-semibold leading-7 ${editorial}`}
                  >
                    <MarketingBrandText text={item.title} />
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-foreground-muted">
                    <MarketingBrandText text={item.body} />
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-20 lg:py-24">
        <div className="mx-auto w-full max-w-3xl">
          <h2
            className={`text-center text-3xl font-semibold sm:text-4xl ${editorial}`}
          >
            <MarketingBrandText text={pricing.faqTitle} />
          </h2>
          <div className="relative mt-10 grid gap-4 before:absolute before:-inset-x-8 before:-top-10 before:-z-10 before:h-40 before:bg-[var(--lf-primary-soft)] before:content-['']">
            {pricing.faqs.map((faq, index) => (
              <details
                key={faq.question}
                open={index === 0}
                className="group rounded-2xl border border-border bg-white p-5 shadow-[var(--lf-shadow-soft)] open:shadow-[var(--lf-shadow-raised)] sm:px-7 sm:py-6"
              >
                <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-4 font-bold leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] [&::-webkit-details-marker]:hidden">
                  <MarketingBrandText text={faq.question} />
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-primary transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-4 border-t border-border pt-4 text-sm leading-7 text-foreground-muted">
                  <MarketingBrandText text={faq.answer} />
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 pt-8 sm:px-8 lg:px-20 lg:pb-28">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center overflow-hidden rounded-3xl border border-white/10 bg-[#171717] px-6 py-14 text-center text-[#fff9f5] shadow-[var(--lf-shadow-raised)] sm:px-10 lg:py-20">
          <Gift size={23} className="text-primary" aria-hidden="true" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-primary">
            <MarketingBrandText text={pricing.finalEyebrow} />
          </p>
          <h2
            className={`mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl ${editorial}`}
          >
            <MarketingBrandText text={pricing.finalTitle} />
          </h2>
          <p className="mt-5 max-w-xl leading-8 text-[#d7cbc5]">
            <MarketingBrandText text={pricing.finalBody} />
          </p>
          <Link
            href="/get-started"
            className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3 font-bold text-[var(--lf-primary-foreground)] transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717]"
          >
            <MarketingBrandText text={pricing.cta} />
            <ArrowUpRight
              size={18}
              className="rtl:-scale-x-100"
              aria-hidden="true"
            />
          </Link>
          <p className="mt-4 text-sm text-[#aa9e98]"><MarketingBrandText text={pricing.trialNote} /></p>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
