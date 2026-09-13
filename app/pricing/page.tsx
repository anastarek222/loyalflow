import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { loyalFlowPlans, type LoyalFlowPlan } from "@/lib/entitlements";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection, type SupportedLocale } from "@/lib/i18n/config";
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
  CreditCard,
  Gift,
  LineChart,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Users,
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

const planPresentation: Record<
  LoyalFlowPlan,
  {
    icon: typeof Store;
    nameKey: MessageKey;
    bodyKey: MessageKey;
    commercialKey: MessageKey;
  }
> = {
  FREE: {
    icon: Store,
    nameKey: "marketing.pricing.freePlanName",
    bodyKey: "marketing.pricing.freePlanBody",
    commercialKey: "marketing.pricing.freeCommercial",
  },
  STARTER: {
    icon: LineChart,
    nameKey: "marketing.pricing.starterPlanName",
    bodyKey: "marketing.pricing.starterPlanBody",
    commercialKey: "marketing.pricing.managedCommercial",
  },
  PRO: {
    icon: Users,
    nameKey: "marketing.pricing.proPlanName",
    bodyKey: "marketing.pricing.proPlanBody",
    commercialKey: "marketing.pricing.managedCommercial",
  },
  BUSINESS: {
    icon: Building2,
    nameKey: "marketing.pricing.businessPlanName",
    bodyKey: "marketing.pricing.businessPlanBody",
    commercialKey: "marketing.pricing.managedCommercial",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const title = translate(locale, "marketing.pricing.metaTitle");
  const description = translate(locale, "marketing.pricing.metaDescription");

  return {
    title,
    description,
    alternates: { canonical: "/pricing" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({ title, description, path: "/pricing" }),
  };
}

function PlanCard({
  locale,
  plan,
  index,
}: {
  locale: SupportedLocale;
  plan: LoyalFlowPlan;
  index: number;
}) {
  const presentation = planPresentation[plan];
  const Icon = presentation.icon;
  const featured = plan === "FREE";

  return (
    <article
      className={`relative flex min-w-0 flex-col rounded-3xl border bg-white p-6 transition duration-200 hover:-translate-y-1 hover:shadow-[var(--lf-shadow-raised)] sm:p-7 ${
        featured
          ? "border-primary shadow-[var(--lf-shadow-raised)] ring-1 ring-primary/20"
          : "border-border shadow-[var(--lf-shadow-soft)]"
      }`}
    >
      {featured ? (
        <span className="absolute -top-3 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--lf-primary-foreground)] rtl:translate-x-1/2">
          {translate(locale, "marketing.pricing.startHere")}
        </span>
      ) : null}

      <div className="flex items-center justify-between gap-4 pt-1">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-foreground-muted">
          {translate(locale, "marketing.pricing.planLabel")}{" "}
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={`flex size-9 items-center justify-center rounded-xl ${
            featured
              ? "bg-[var(--lf-primary-soft)] text-primary"
              : "bg-surface-subtle text-foreground-muted"
          }`}
        >
          <Icon size={17} aria-hidden="true" />
        </span>
      </div>

      <h2 className="mt-6 text-2xl font-black">
        {translate(locale, presentation.nameKey)}
      </h2>
      <p
        className={`mt-3 min-h-16 text-2xl font-semibold leading-tight ${featured ? "text-primary" : "text-foreground"}`}
      >
        {translate(locale, presentation.commercialKey)}
      </p>
      <p className="mt-5 min-h-24 text-sm leading-7 text-foreground-muted">
        {translate(locale, presentation.bodyKey)}
      </p>

      <Link
        href="/get-started"
        className={`mt-auto inline-flex min-h-[52px] items-center justify-center rounded-2xl px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] focus-visible:ring-offset-2 ${
          featured
            ? "bg-primary text-[var(--lf-primary-foreground)] hover:bg-primary-hover"
            : "border border-border bg-surface-subtle text-foreground hover:border-primary/40 hover:text-primary"
        }`}
      >
        {translate(locale, "marketing.pricing.cta")}
      </Link>
    </article>
  );
}

export default async function PricingPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const navigation = getPublicMarketingNavigation(locale);
  const editorial =
    locale === "en"
      ? "[font-family:var(--font-marketing-editorial)]"
      : "[font-family:var(--font-marketing-sans)]";
  const included = [
    [
      Palette,
      "marketing.pricing.includedBrandTitle",
      "marketing.pricing.includedBrandBody",
    ],
    [
      LineChart,
      "marketing.pricing.includedActivityTitle",
      "marketing.pricing.includedActivityBody",
    ],
    [
      SlidersHorizontal,
      "marketing.pricing.includedRewardsTitle",
      "marketing.pricing.includedRewardsBody",
    ],
    [
      CreditCard,
      "marketing.pricing.includedContextTitle",
      "marketing.pricing.includedContextBody",
    ],
  ] as const;
  const faqs = [
    ["marketing.pricing.faqOneQuestion", "marketing.pricing.faqOneAnswer"],
    ["marketing.pricing.faqTwoQuestion", "marketing.pricing.faqTwoAnswer"],
    ["marketing.pricing.faqThreeQuestion", "marketing.pricing.faqThreeAnswer"],
    ["marketing.pricing.faqFourQuestion", "marketing.pricing.faqFourAnswer"],
  ] as const;

  return (
    <main
      lang={locale}
      dir={direction}
      className={`${marketingSans.variable} ${marketingEditorial.variable} lf-marketing-surface min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] text-foreground [font-family:var(--font-marketing-sans)] [overflow-wrap:anywhere]`}
    >
      <MarketingHeader
        locale={locale}
        brand={copy("common.brand")}
        signIn={copy("auth.signIn")}
        primaryCta={copy("marketing.primaryCta")}
        menuLabel={copy("marketing.menuOpen")}
        closeLabel={copy("marketing.menuClose")}
        navigation={navigation}
      />

      <section className="px-5 pb-10 pt-16 text-center sm:px-8 lg:px-20 lg:pb-16 lg:pt-24">
        <div className="mx-auto w-full max-w-[1240px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-primary shadow-[var(--lf-shadow-soft)]">
            <span className="size-1.5 rounded-full bg-primary" />
            {copy("marketing.pricing.eyebrow")}
          </span>
          <h1
            className={`mx-auto mt-6 max-w-4xl text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl ${editorial}`}
          >
            {copy("marketing.pricing.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-foreground-muted sm:text-lg">
            {copy("marketing.pricing.body")}
          </p>

          <div className="mx-auto mt-8 grid max-w-3xl gap-3 rounded-2xl border border-border bg-white p-4 text-sm font-semibold text-foreground-muted shadow-[var(--lf-shadow-soft)] sm:grid-cols-3 sm:rounded-full sm:px-6">
            <span className="inline-flex items-center justify-center gap-2">
              <BadgeCheck
                size={18}
                className="text-primary"
                aria-hidden="true"
              />
              {copy("marketing.pricing.proofTrial")}
            </span>
            <span className="inline-flex items-center justify-center gap-2 sm:border-x sm:border-border sm:px-4">
              <CreditCard
                size={18}
                className="text-primary"
                aria-hidden="true"
              />
              {copy("marketing.pricing.proofPayment")}
            </span>
            <span className="inline-flex items-center justify-center gap-2">
              <ShieldCheck
                size={18}
                className="text-primary"
                aria-hidden="true"
              />
              {copy("marketing.pricing.proofSetup")}
            </span>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-20 lg:py-16">
        <div className="mx-auto grid w-full max-w-[1240px] gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {loyalFlowPlans.map((plan, index) => (
            <PlanCard key={plan} locale={locale} plan={plan} index={index} />
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-6 text-foreground-muted sm:text-sm">
          {copy("marketing.pricing.planFootnote")}
        </p>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-20 lg:py-24">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              {copy("marketing.pricing.includedEyebrow")}
            </p>
            <h2
              className={`mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl ${editorial}`}
            >
              {copy("marketing.pricing.includedTitle")}
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {included.map(([Icon, titleKey, bodyKey]) => (
              <article
                key={titleKey}
                className="min-h-60 rounded-3xl border border-border bg-white p-6 shadow-[var(--lf-shadow-soft)] sm:p-7"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <h3 className="mt-7 text-lg font-black leading-7">
                  {copy(titleKey)}
                </h3>
                <p className="mt-4 text-sm leading-7 text-foreground-muted">
                  {copy(bodyKey)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-20 lg:py-24">
        <div className="mx-auto w-full max-w-3xl">
          <h2
            className={`text-center text-3xl font-semibold sm:text-4xl ${editorial}`}
          >
            {copy("marketing.pricing.faqTitle")}
          </h2>
          <div className="relative mt-10 grid gap-4 before:absolute before:-inset-x-8 before:-top-10 before:-z-10 before:h-40 before:bg-[var(--lf-primary-soft)] before:content-['']">
            {faqs.map(([questionKey, answerKey], index) => (
              <details
                key={questionKey}
                open={index === 0}
                className="group rounded-2xl border border-border bg-white p-5 shadow-[var(--lf-shadow-soft)] open:shadow-[var(--lf-shadow-raised)] sm:px-7 sm:py-6"
              >
                <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-4 font-bold leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] [&::-webkit-details-marker]:hidden">
                  {copy(questionKey)}
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-primary transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-4 border-t border-border pt-4 text-sm leading-7 text-foreground-muted">
                  {copy(answerKey)}
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
            {copy("marketing.pricing.finalEyebrow")}
          </p>
          <h2
            className={`mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl ${editorial}`}
          >
            {copy("marketing.pricing.finalTitle")}
          </h2>
          <p className="mt-5 max-w-xl leading-8 text-[#d7cbc5]">
            {copy("marketing.pricing.finalBody")}
          </p>
          <Link
            href="/get-started"
            className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3 font-bold text-[var(--lf-primary-foreground)] transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717]"
          >
            {copy("marketing.pricing.cta")}
            <ArrowUpRight
              size={18}
              className="rtl:-scale-x-100"
              aria-hidden="true"
            />
          </Link>
          <p className="mt-4 text-sm text-[#aa9e98]">
            {copy("marketing.home.trialNote")}
          </p>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
