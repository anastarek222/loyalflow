import { auth } from "@/auth";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { ProductPreview } from "@/components/marketing/product-preview";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import { buildPublicWebsiteStructuredData } from "@/lib/seo/public-website-structured-data";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Coffee,
  Dumbbell,
  Gift,
  HeartHandshake,
  QrCode,
  ScanLine,
  Scissors,
  Shirt,
  Repeat2,
  Store,
  TrendingUp,
  UserRoundCheck,
  Users,
} from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const title = translate(locale, "marketing.metaTitle");
  const description = translate(locale, "marketing.metaDescription");

  return {
    title,
    description,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({
      title,
      description,
      path: "/",
    }),
  };
}

type ProofCardProps = {
  icon: typeof Store;
  eyebrow: string;
  title: string;
  body: string;
  step: number;
};

function ProofCard({ icon: Icon, eyebrow, title, body, step }: ProofCardProps) {
  return (
    <div className="relative min-h-[19rem] overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-[var(--lf-shadow-raised)] sm:p-7">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--lf-primary-soft)] text-primary">
            <Icon size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {eyebrow}
            </p>
            <p className="mt-1 text-sm font-bold text-foreground">{title}</p>
          </div>
        </div>
        <span dir="ltr" className="text-sm font-black text-foreground-subtle">
          0{step}
        </span>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_0.72fr]">
        <div className="rounded-2xl bg-surface-subtle p-4">
          <div className="h-2 w-20 rounded-full bg-primary/25" />
          <div className="mt-5 space-y-3">
            <div className="h-2.5 w-full rounded-full bg-foreground/10" />
            <div className="h-2.5 w-4/5 rounded-full bg-foreground/10" />
            <div className="h-2.5 w-3/5 rounded-full bg-foreground/10" />
          </div>
        </div>
        <div className="flex min-h-32 flex-col justify-between rounded-2xl border border-primary/20 bg-[var(--lf-primary-soft)] p-4">
          <Repeat2 size={22} className="text-primary" aria-hidden="true" />
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-primary/15">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${step * 25}%` }}
            />
          </div>
        </div>
      </div>
      <p className="mt-5 text-sm leading-7 text-foreground-muted">{body}</p>
    </div>
  );
}

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const navigation = getPublicMarketingNavigation(locale);
  const websiteStructuredData = buildPublicWebsiteStructuredData({
    description: copy("marketing.metaDescription"),
    locale,
  });

  const relationship = [
    [ScanLine, "marketing.home.relationshipInteraction"],
    [UserRoundCheck, "marketing.home.relationshipRecognition"],
    [Gift, "marketing.home.relationshipReward"],
    [HeartHandshake, "marketing.home.relationshipReturn"],
    [TrendingUp, "marketing.home.relationshipValue"],
  ] as const;

  const journey = [
    [Store, "marketing.workflowOne", "marketing.home.workflowOneBody"],
    [Users, "marketing.workflowTwo", "marketing.home.workflowTwoBody"],
    [BarChart3, "marketing.workflowThree", "marketing.home.workflowThreeBody"],
  ] as const;

  const essentials = [
    [QrCode, "marketing.features.cardsTitle", "marketing.features.cardsBody"],
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

  const benefits = [
    [
      TrendingUp,
      "marketing.home.benefitReturnTitle",
      "marketing.home.benefitReturnBody",
    ],
    [
      HeartHandshake,
      "marketing.home.benefitRelationshipTitle",
      "marketing.home.benefitRelationshipBody",
    ],
    [
      BarChart3,
      "marketing.home.benefitInsightTitle",
      "marketing.home.benefitInsightBody",
    ],
    [
      Repeat2,
      "marketing.home.benefitBrandTitle",
      "marketing.home.benefitBrandBody",
    ],
  ] as const;

  const industries = [
    [Coffee, "marketing.industryCafe"],
    [Scissors, "marketing.industryBeauty"],
    [Shirt, "marketing.industryRetail"],
    [Dumbbell, "marketing.industryFitness"],
  ] as const;

  const outcomes = [
    [
      CircleDollarSign,
      "marketing.home.outcomeOneTitle",
      "marketing.home.outcomeOneBody",
    ],
    [
      UserRoundCheck,
      "marketing.home.outcomeTwoTitle",
      "marketing.home.outcomeTwoBody",
    ],
    [
      HeartHandshake,
      "marketing.home.outcomeThreeTitle",
      "marketing.home.outcomeThreeBody",
    ],
  ] as const;

  const faq = [
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
      className="lf-marketing-surface min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] text-foreground [overflow-wrap:anywhere]"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteStructuredData).replace(/</g, "\\u003c"),
        }}
      />
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
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-2 lg:px-10 lg:py-28">
          <div className="lf-marketing-reveal">
            <h1 className="max-w-3xl text-[clamp(2.35rem,5vw,4rem)] font-semibold leading-[1.12] tracking-[-0.025em] text-foreground">
              {copy("marketing.home.heroTitle")}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-foreground-muted sm:text-lg sm:leading-9">
              {copy("marketing.home.heroBody")}
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
                href="/features"
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-border-strong bg-transparent px-7 py-3 font-bold text-foreground transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
              >
                {copy("marketing.secondaryCta")}
              </Link>
            </div>
            <p className="mt-5 text-sm leading-6 text-foreground-subtle">
              {copy("marketing.home.trialNote")}
            </p>
          </div>
          <div className="lf-marketing-reveal lf-marketing-delay-1">
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

      <section className="bg-[#171717] px-5 py-20 text-[#fff9f5] sm:px-8 lg:py-28">
        <div className="mx-auto grid w-full max-w-[1240px] gap-12 lg:grid-cols-2 lg:gap-0">
          <article className="lg:border-e lg:border-white/15 lg:pe-16">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
              {copy("marketing.home.problemEyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              {copy("marketing.home.problemTitle")}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#c7bfba]">
              {copy("marketing.home.problemBody")}
            </p>
          </article>
          <article className="lg:ps-16">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
              {copy("marketing.home.solutionEyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              {copy("marketing.home.solutionTitle")}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#c7bfba]">
              {copy("marketing.home.solutionBody")}
            </p>
          </article>
        </div>
      </section>

      <section
        aria-label={copy("marketing.trustSectionLabel")}
        className="px-5 py-20 sm:px-8 lg:py-28"
      >
        <div className="mx-auto w-full max-w-[1240px] text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {copy("marketing.home.relationshipTitle")}
          </h2>
          <ol className="relative mt-12 grid grid-cols-1 gap-8 sm:grid-cols-5 sm:gap-4">
            {relationship.map(([Icon, key], index) => (
              <li
                key={key}
                className="relative flex flex-col items-center gap-4"
              >
                <span className="relative z-10 flex size-12 items-center justify-center rounded-full border border-border bg-surface text-primary">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="text-sm font-bold text-foreground-muted">
                  {copy(key)}
                </span>
                {index < relationship.length - 1 ? (
                  <span className="absolute top-6 hidden h-px w-[calc(100%-3rem)] bg-border ltr:left-[calc(50%+1.5rem)] rtl:right-[calc(50%+1.5rem)] sm:block" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-24 border-y border-border bg-surface px-5 py-20 sm:px-8 lg:py-28"
      >
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              {copy("marketing.home.journeyTitle")}
            </h2>
            <p className="mt-5 text-base leading-8 text-foreground-muted sm:text-lg">
              {copy("marketing.home.journeyBody")}
            </p>
          </div>
          <div className="mt-16 space-y-16 lg:space-y-24">
            {journey.map(([Icon, titleKey, bodyKey], index) => (
              <article
                key={titleKey}
                className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
              >
                <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
                    {copy("marketing.home.stepLabel")} {index + 1}
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
                    {copy(titleKey)}
                  </h3>
                  <p className="mt-4 max-w-xl text-base leading-8 text-foreground-muted">
                    {copy(bodyKey)}
                  </p>
                </div>
                <ProofCard
                  icon={Icon}
                  eyebrow={`${copy("marketing.home.stepLabel")} ${index + 1}`}
                  title={copy(titleKey)}
                  body={copy(bodyKey)}
                  step={index + 1}
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="product"
        className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28"
      >
        <div className="mx-auto grid w-full max-w-[1240px] gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-20">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">
              {copy("marketing.features.title")}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-foreground-muted">
              {copy("marketing.features.body")}
            </p>
            <div className="mt-9 grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {essentials.map(([Icon, titleKey, bodyKey]) => (
                <article key={titleKey}>
                  <Icon size={21} className="text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-bold text-foreground">
                    {copy(titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-foreground-muted">
                    {copy(bodyKey)}
                  </p>
                </article>
              ))}
            </div>
          </div>
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
      </section>

      <section className="border-y border-border bg-surface px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">
              {copy("marketing.home.benefitsTitle")}
            </h2>
            <p className="mt-5 text-base leading-8 text-foreground-muted">
              {copy("marketing.home.benefitsBody")}
            </p>
          </div>
          <div className="mt-12 grid gap-x-12 lg:grid-cols-2">
            {benefits.map(([Icon, titleKey, bodyKey]) => (
              <article
                key={titleKey}
                className="grid grid-cols-[auto_1fr] gap-4 border-t border-border py-7"
              >
                <Icon
                  size={21}
                  className="mt-1 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-bold">{copy(titleKey)}</h3>
                  <p className="mt-2 text-sm leading-7 text-foreground-muted">
                    {copy(bodyKey)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="industries"
        className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-24"
      >
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
              {copy("marketing.industriesTitle")}
            </h2>
            <p className="mt-4 text-base leading-8 text-foreground-muted">
              {copy("marketing.home.industriesBody")}
            </p>
          </div>
          <ul className="flex max-w-xl flex-wrap gap-3">
            {industries.map(([Icon, key]) => (
              <li
                key={key}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-bold text-foreground-muted"
              >
                <Icon size={17} className="text-primary" aria-hidden="true" />
                {copy(key)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#171717] px-5 py-20 text-[#fff9f5] sm:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-[1240px] rounded-3xl border border-white/10 bg-white/[0.035] px-5 py-12 sm:px-10 lg:px-14 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
              {copy("marketing.home.outcomesEyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
              {copy("marketing.home.outcomesTitle")}
            </h2>
            <p className="mt-5 text-base leading-8 text-[#c7bfba]">
              {copy("marketing.home.outcomesBody")}
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {outcomes.map(([Icon, titleKey, bodyKey], index) => (
              <article
                key={titleKey}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-6"
              >
                <div className="flex items-center justify-between">
                  <Icon size={22} className="text-primary" aria-hidden="true" />
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-black text-[#171717]">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-7 text-lg font-bold">{copy(titleKey)}</h3>
                <p className="mt-3 text-sm leading-7 text-[#c7bfba]">
                  {copy(bodyKey)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="security"
        className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28"
      >
        <div className="mx-auto grid w-full max-w-[1240px] gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">
              {copy("marketing.home.ownershipTitle")}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-foreground-muted">
              {copy("marketing.home.ownershipBody")}
            </p>
          </div>
          <Link
            href="/features"
            className="inline-flex min-h-12 items-center gap-2 font-bold text-primary underline-offset-4 hover:underline lg:justify-self-end"
          >
            {copy("marketing.home.securityLink")}
            <ArrowUpRight
              size={18}
              className="rtl:-scale-x-100"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-24 border-t border-border bg-surface px-5 py-20 sm:px-8 lg:py-28"
      >
        <div className="mx-auto w-full max-w-[1240px]">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-5xl">
            {copy("marketing.faqTitle")}
          </h2>
          <div className="mt-12 grid items-start gap-3 lg:grid-cols-2">
            {faq.map(([questionKey, answerKey]) => (
              <details
                key={questionKey}
                className="group rounded-2xl border border-border bg-[var(--lf-marketing-canvas)] px-5"
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 font-bold marker:content-none">
                  <span>{copy(questionKey)}</span>
                  <span
                    className="text-xl text-primary transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="border-t border-border pb-5 pt-4 text-sm leading-7 text-foreground-muted">
                  {copy(answerKey)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#171717] px-5 py-20 text-center text-[#fff9f5] sm:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">
            {copy("marketing.home.finalTitle")}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#c7bfba]">
            {copy("marketing.home.finalBody")}
          </p>
          <Link
            href="/get-started"
            className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3 font-bold text-[#171717] transition hover:bg-primary-hover"
          >
            {copy("marketing.primaryCta")}
            <ArrowUpRight
              size={18}
              className="rtl:-scale-x-100"
              aria-hidden="true"
            />
          </Link>
          <p className="mt-4 text-sm text-[#c7bfba]">
            {copy("marketing.home.trialNote")}
          </p>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
