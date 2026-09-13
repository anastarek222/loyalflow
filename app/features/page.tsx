import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { ProductPreview } from "@/components/marketing/product-preview";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection, type SupportedLocale } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import type { Metadata } from "next";
import { Alexandria, Libre_Bodoni } from "next/font/google";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CreditCard,
  Gift,
  HeartHandshake,
  History,
  LineChart,
  QrCode,
  Search,
  ShieldCheck,
  Stamp,
  UserPlus,
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const title = translate(locale, "marketing.features.metaTitle");
  const description = translate(locale, "marketing.features.metaDescription");
  return {
    title,
    description,
    alternates: { canonical: "/features" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({ title, description, path: "/features" }),
  };
}

function BrandedCardPreview({ locale }: { locale: SupportedLocale }) {
  return (
    <div
      role="img"
      aria-label={translate(locale, "marketing.features.cardsTitle")}
      className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-[var(--lf-shadow-raised)] sm:p-8"
    >
      <div className="absolute -end-20 -top-20 size-56 rounded-full border border-primary/20" />
      <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.35rem] bg-primary p-6 text-[var(--lf-primary-foreground)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">
              Tanee loyalty
            </p>
            <p className="mt-2 text-xl font-black">Nile Brew Café</p>
          </div>
          <span className="rounded-xl bg-white p-2 text-primary">
            <QrCode size={42} aria-hidden="true" />
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold opacity-75">
            {translate(locale, "marketing.previewReward")}
          </p>
          <p className="mt-1 text-xl font-black">
            {translate(locale, "marketing.previewRewardName")}
          </p>
          <div className="mt-6 flex items-end justify-between gap-4">
            <p className="text-sm font-bold">Ahmed Mohamed</p>
            <p dir="ltr" className="text-2xl font-black">
              4 / 5
            </p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-black/15">
            <div className="h-full w-4/5 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RewardsPreview({ locale }: { locale: SupportedLocale }) {
  const rewards = [
    [translate(locale, "marketing.previewRewardName"), "4 / 5", "80%"],
    [translate(locale, "marketing.features.rewardsTitle"), "2 / 6", "34%"],
  ] as const;
  return (
    <div
      role="img"
      aria-label={translate(locale, "marketing.features.rewardsSectionTitle")}
      className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-white p-5 shadow-[var(--lf-shadow-raised)] sm:p-7"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {translate(locale, "marketing.features.rewardsEyebrow")}
          </p>
          <p className="mt-1 font-black">Nile Brew Café</p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
          <Gift size={21} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5 grid gap-4">
        {rewards.map(([title, progress, width], index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-xl border border-border bg-surface-subtle p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
                  <Stamp size={17} aria-hidden="true" />
                </span>
                <p className="truncate text-sm font-bold">{title}</p>
              </div>
              <p dir="ltr" className="shrink-0 text-sm font-black text-primary">
                {progress}
              </p>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsPreview({ locale }: { locale: SupportedLocale }) {
  const bars = [42, 68, 55, 84, 72, 92, 78];
  return (
    <div
      role="img"
      aria-label={translate(locale, "marketing.features.insightsTitle")}
      className="mx-auto flex aspect-[4/3] w-full max-w-xl flex-col rounded-2xl border border-border bg-white p-5 shadow-[var(--lf-shadow-raised)] sm:p-7"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {translate(locale, "marketing.features.activityItemTitle")}
          </p>
          <p dir="ltr" className="mt-2 text-3xl font-black">
            +24%
          </p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
          <LineChart size={21} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-8 flex min-h-0 flex-1 items-end gap-3 border-b border-border px-2 sm:gap-5">
        {bars.map((height, index) => (
          <div key={height + index} className="flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg bg-primary/20"
              style={{ height: `${height}%` }}
            >
              <div className="h-2/5 w-full rounded-t-lg bg-primary" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-subtle p-3">
          <p className="text-xs text-foreground-muted">
            {translate(locale, "marketing.previewActiveCustomers")}
          </p>
          <p dir="ltr" className="mt-1 text-lg font-black">
            248
          </p>
        </div>
        <div className="rounded-xl bg-[var(--lf-primary-soft)] p-3 text-primary">
          <p className="text-xs">
            {translate(locale, "marketing.previewRepeatRate")}
          </p>
          <p dir="ltr" className="mt-1 text-lg font-black">
            68%
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function FeaturesPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const navigation = getPublicMarketingNavigation(locale);
  const editorial =
    locale === "en"
      ? "[font-family:var(--font-marketing-editorial)]"
      : "[font-family:var(--font-marketing-sans)]";
  const capabilities = [
    [
      CreditCard,
      "marketing.features.cardsTitle",
      "marketing.features.cardsBody",
    ],
    [
      Users,
      "marketing.features.customersTitle",
      "marketing.features.customersBody",
    ],
    [Gift, "marketing.features.rewardsTitle", "marketing.features.rewardsBody"],
    [
      BarChart3,
      "marketing.features.reportingTitle",
      "marketing.features.reportingBody",
    ],
  ] as const;
  const activityCards = [
    [
      Users,
      "marketing.features.profilesTitle",
      "marketing.features.profilesBody",
    ],
    [
      History,
      "marketing.features.historyTitle",
      "marketing.features.historyBody",
    ],
    [
      Search,
      "marketing.features.contextTitle",
      "marketing.features.contextBody",
    ],
  ] as const;
  const insightItems = [
    [
      "marketing.features.activityItemTitle",
      "marketing.features.activityItemBody",
    ],
    [
      "marketing.features.progressItemTitle",
      "marketing.features.progressItemBody",
    ],
    [
      "marketing.features.engagementItemTitle",
      "marketing.features.engagementItemBody",
    ],
    [
      "marketing.features.improvementItemTitle",
      "marketing.features.improvementItemBody",
    ],
  ] as const;
  const journey = [
    [UserPlus, "marketing.features.journeyJoin"],
    [CreditCard, "marketing.features.journeyCard"],
    [Activity, "marketing.features.journeyProgress"],
    [Gift, "marketing.features.journeyReward"],
    [HeartHandshake, "marketing.features.journeyRelationship"],
  ] as const;
  const outcomes = [
    "marketing.features.outcomeOne",
    "marketing.features.outcomeTwo",
    "marketing.features.outcomeThree",
    "marketing.features.outcomeFour",
  ] as const;
  const faqs = [
    ["marketing.features.faqOneQuestion", "marketing.features.faqOneAnswer"],
    ["marketing.features.faqTwoQuestion", "marketing.features.faqTwoAnswer"],
    [
      "marketing.features.faqThreeQuestion",
      "marketing.features.faqThreeAnswer",
    ],
    ["marketing.features.faqFourQuestion", "marketing.features.faqFourAnswer"],
    ["marketing.features.faqFiveQuestion", "marketing.features.faqFiveAnswer"],
    ["marketing.features.faqSixQuestion", "marketing.features.faqSixAnswer"],
  ] as const;
  const bullets = (keys: readonly MessageKey[], checks = false) => (
    <ul className="mt-8 grid gap-4">
      {keys.map((key) => (
        <li key={key} className="flex items-start gap-3 leading-7">
          {checks ? (
            <Check
              size={18}
              className="mt-1 shrink-0 text-primary"
              aria-hidden="true"
            />
          ) : (
            <span className="mt-2.5 size-2 shrink-0 rounded-full bg-primary" />
          )}
          {copy(key)}
        </li>
      ))}
    </ul>
  );

  return (
    <main
      lang={locale}
      dir={direction}
      className={`lf-marketing-surface ${marketingSans.variable} ${marketingEditorial.variable} min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] font-[family-name:var(--font-marketing-sans)] text-foreground [overflow-wrap:anywhere]`}
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

      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-12 lg:px-20 lg:py-28">
          <div className="lg:col-span-7 lg:pe-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {copy("marketing.features.eyebrow")}
            </p>
            <h1
              className={`mt-4 max-w-3xl text-[clamp(2.35rem,4.3vw,4rem)] font-semibold leading-[1.08] tracking-[-0.025em] ${editorial}`}
            >
              {copy("marketing.features.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-foreground-muted sm:text-lg sm:leading-9">
              {copy("marketing.features.body")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/get-started"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3 font-bold text-[var(--lf-primary-foreground)] transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] focus-visible:ring-offset-2"
              >
                {copy("marketing.primaryCta")}
                <ArrowUpRight
                  size={18}
                  className="rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/#how-it-works"
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-border-strong px-7 py-3 font-bold transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
              >
                {copy("marketing.secondaryCta")}
              </Link>
            </div>
            <p className="mt-5 text-sm text-foreground-subtle">
              {copy("marketing.home.trialNote")}
            </p>
          </div>
          <div className="lg:col-span-5">
            <ProductPreview
              locale={locale}
              labels={{
                preview: copy("marketing.previewLabel"),
                dashboard: copy("marketing.previewDashboard"),
                activeCustomers: copy("marketing.previewActiveCustomers"),
                repeatRate: copy("marketing.previewRepeatRate"),
                activity: copy("marketing.previewActivity"),
                customer: copy("marketing.previewCustomer"),
                visits: copy("marketing.previewVisits"),
                reward: copy("marketing.previewReward"),
                readySoon: copy("marketing.previewReadySoon"),
              }}
            />
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-20 lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`text-3xl font-semibold sm:text-4xl ${editorial}`}>
              {copy("marketing.features.overviewTitle")}
            </h2>
            <p className="mt-4 leading-8 text-foreground-muted">
              {copy("marketing.features.overviewBody")}
            </p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(([Icon, titleKey, bodyKey]) => (
              <article
                key={titleKey}
                className="rounded-2xl border border-border bg-white p-6 shadow-[var(--lf-shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-primary/45"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-lg font-bold leading-7">
                  {copy(titleKey)}
                </h3>
                <p className="mt-3 text-sm leading-7 text-foreground-muted">
                  {copy(bodyKey)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border px-5 py-20 sm:px-8 lg:px-20 lg:py-28">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {copy("marketing.features.brandEyebrow")}
            </p>
            <h2
              className={`mt-3 text-3xl font-semibold sm:text-4xl ${editorial}`}
            >
              {copy("marketing.features.brandTitle")}
            </h2>
            <p className="mt-5 leading-8 text-foreground-muted">
              {copy("marketing.features.brandBody")}
            </p>
            {bullets([
              "marketing.features.brandPointOne",
              "marketing.features.brandPointTwo",
              "marketing.features.brandPointThree",
            ])}
          </div>
          <BrandedCardPreview locale={locale} />
        </div>
      </section>

      <section className="bg-[#171717] px-5 py-20 text-[#fff9f5] sm:px-8 lg:px-20 lg:py-24">
        <div className="mx-auto w-full max-w-[1240px]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {copy("marketing.features.activityEyebrow")}
          </p>
          <h2
            className={`mt-3 max-w-3xl text-3xl font-semibold sm:text-4xl ${editorial}`}
          >
            {copy("marketing.features.activityTitle")}
          </h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#d7cbc5]">
            {copy("marketing.features.activityBody")}
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {activityCards.map(([Icon, titleKey, bodyKey], index) => (
              <article
                key={titleKey}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold">{copy(titleKey)}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d7cbc5]">
                  {copy(bodyKey)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-20 lg:py-28">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <RewardsPreview locale={locale} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {copy("marketing.features.rewardsEyebrow")}
            </p>
            <h2
              className={`mt-3 text-3xl font-semibold sm:text-4xl ${editorial}`}
            >
              {copy("marketing.features.rewardsSectionTitle")}
            </h2>
            <p className="mt-5 leading-8 text-foreground-muted">
              {copy("marketing.features.rewardsSectionBody")}
            </p>
            {bullets(
              [
                "marketing.features.rewardsPointOne",
                "marketing.features.rewardsPointTwo",
                "marketing.features.rewardsPointThree",
                "marketing.features.rewardsPointFour",
              ],
              true,
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-border px-5 py-20 sm:px-8 lg:px-20 lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="max-w-3xl">
            <h2 className={`text-3xl font-semibold sm:text-4xl ${editorial}`}>
              {copy("marketing.features.insightsTitle")}
            </h2>
            <p className="mt-4 leading-8 text-foreground-muted">
              {copy("marketing.features.insightsBody")}
            </p>
          </div>
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="grid gap-4">
              {insightItems.map(([titleKey, bodyKey]) => (
                <article
                  key={titleKey}
                  className="rounded-xl border border-border bg-white p-5"
                >
                  <h3 className="font-bold">{copy(titleKey)}</h3>
                  <p className="mt-2 text-sm leading-7 text-foreground-muted">
                    {copy(bodyKey)}
                  </p>
                </article>
              ))}
            </div>
            <InsightsPreview locale={locale} />
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-20 lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`text-3xl font-semibold sm:text-4xl ${editorial}`}>
              {copy("marketing.features.journeyTitle")}
            </h2>
            <p className="mt-4 leading-8 text-foreground-muted">
              {copy("marketing.features.journeyBody")}
            </p>
          </div>
          <ol className="relative mt-14 grid gap-4 md:grid-cols-5 md:gap-3">
            <span
              className="absolute inset-x-[8%] top-7 hidden h-px bg-border md:block"
              aria-hidden="true"
            />
            {journey.map(([Icon, labelKey], index) => (
              <li
                key={labelKey}
                className="relative flex items-center gap-4 rounded-2xl border border-border bg-white p-4 md:flex-col md:border-0 md:bg-transparent md:p-0 md:text-center"
              >
                <span
                  className={`relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border ${index === journey.length - 1 ? "bg-primary text-[var(--lf-primary-foreground)]" : "bg-surface text-primary"}`}
                >
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary md:mt-4">
                    {locale === "ar" ? "الخطوة" : "Step"} {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6">
                    {copy(labelKey)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-20 lg:pb-28">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-8 rounded-2xl border border-border bg-white p-7 shadow-[var(--lf-shadow-soft)] sm:p-10 lg:grid-cols-[1fr_auto] lg:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {copy("marketing.features.securityEyebrow")}
            </p>
            <h2
              className={`mt-3 max-w-3xl text-3xl font-semibold sm:text-4xl ${editorial}`}
            >
              {copy("marketing.features.securityTitle")}
            </h2>
            <p className="mt-4 max-w-3xl leading-8 text-foreground-muted">
              {copy("marketing.features.securityBody")}
            </p>
            {bullets(
              [
                "marketing.features.securityPointOne",
                "marketing.features.securityPointTwo",
                "marketing.features.securityPointThree",
              ],
              true,
            )}
            <Link
              href="/privacy"
              className="mt-7 inline-flex min-h-11 items-center gap-2 font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
            >
              {copy("marketing.features.securityLink")}
              <ArrowUpRight
                size={17}
                className="rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
          </div>
          <span className="flex size-24 items-center justify-center rounded-full border border-primary/20 bg-[var(--lf-primary-soft)] text-primary sm:size-28">
            <ShieldCheck size={44} strokeWidth={1.6} aria-hidden="true" />
          </span>
        </div>
      </section>

      <section className="bg-[#171717] px-5 py-20 text-[#fff9f5] sm:px-8 lg:px-20 lg:py-24">
        <div className="mx-auto w-full max-w-[1240px]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {copy("marketing.features.outcomesEyebrow")}
          </p>
          <h2
            className={`mt-3 max-w-3xl text-3xl font-semibold sm:text-4xl ${editorial}`}
          >
            {copy("marketing.features.outcomesTitle")}
          </h2>
          <p className="mt-4 max-w-3xl leading-8 text-[#d7cbc5]">
            {copy("marketing.features.outcomesBody")}
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {outcomes.map((key) => (
              <article
                key={key}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <Check size={20} className="text-primary" aria-hidden="true" />
                <h3 className="mt-5 font-bold leading-7">{copy(key)}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-20 lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <h2
            className={`text-center text-3xl font-semibold sm:text-4xl ${editorial}`}
          >
            {copy("marketing.features.faqTitle")}
          </h2>
          <div className="mt-12 grid items-start gap-4 lg:grid-cols-2">
            {faqs.map(([questionKey, answerKey]) => (
              <details
                key={questionKey}
                className="group rounded-2xl border border-border bg-white p-5 open:shadow-[var(--lf-shadow-soft)]"
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

      <section className="px-5 pb-20 sm:px-8 lg:px-20 lg:pb-28">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center rounded-2xl bg-[#171717] px-6 py-14 text-center text-[#fff9f5] sm:px-10 lg:py-20">
          <Stamp size={24} className="text-primary" aria-hidden="true" />
          <h2
            className={`mt-5 max-w-3xl text-3xl font-semibold sm:text-4xl ${editorial}`}
          >
            {copy("marketing.features.finalTitle")}
          </h2>
          <p className="mt-4 max-w-2xl leading-8 text-[#d7cbc5]">
            {copy("marketing.features.finalBody")}
          </p>
          <Link
            href="/get-started"
            className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3 font-bold text-[var(--lf-primary-foreground)] transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717]"
          >
            {copy("marketing.primaryCta")}
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
