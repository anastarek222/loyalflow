import { auth } from "@/auth";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { ProductPreview } from "@/components/marketing/product-preview";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import { buildPublicWebsiteStructuredData } from "@/lib/seo/public-website-structured-data";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Check,
  Coffee,
  Dumbbell,
  Fingerprint,
  Languages,
  QrCode,
  ScanLine,
  Scissors,
  ShieldCheck,
  Shirt,
  Sparkles,
  Store,
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

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const websiteStructuredData = buildPublicWebsiteStructuredData({
    description: copy("marketing.metaDescription"),
    locale,
  });

  const navigation = getPublicMarketingNavigation(locale);

  const trustItems = [
    [Languages, "marketing.trustArabic"],
    [QrCode, "marketing.trustQr"],
    [ScanLine, "marketing.trustNoApp"],
    [ShieldCheck, "marketing.trustRoles"],
  ] as const;

  const workflow = [
    [Store, "marketing.workflowOne"],
    [ScanLine, "marketing.workflowTwo"],
    [BarChart3, "marketing.workflowThree"],
  ] as const;

  const features = [
    [ScanLine, "marketing.featureOneTitle", "marketing.featureOneBody"],
    [Users, "marketing.featureTwoTitle", "marketing.featureTwoBody"],
    [Sparkles, "marketing.featureThreeTitle", "marketing.featureThreeBody"],
  ] as const;

  const industries = [
    [Coffee, "marketing.industryCafe", "marketing.industryCafeBody"],
    [Scissors, "marketing.industryBeauty", "marketing.industryBeautyBody"],
    [Shirt, "marketing.industryRetail", "marketing.industryRetailBody"],
    [Dumbbell, "marketing.industryFitness", "marketing.industryFitnessBody"],
  ] as const;

  const securityPoints = [
    "marketing.securityRoles",
    "marketing.securityAudit",
    "marketing.securityMfa",
  ] as const;

  const faq = [
    ["marketing.faqOneQuestion", "marketing.faqOneAnswer"],
    ["marketing.faqTwoQuestion", "marketing.faqTwoAnswer"],
    ["marketing.faqThreeQuestion", "marketing.faqThreeAnswer"],
  ] as const;

  return (
    <main
      lang={locale}
      dir={direction}
      className="min-h-screen bg-[var(--lf-marketing-canvas)] text-foreground"
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

      <section className="relative isolate overflow-hidden border-b border-border/70">
        <div
          className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fc_74%,#eef2ff_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute -start-32 top-24 -z-10 size-80 rounded-full bg-indigo-200/45 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -end-40 top-4 -z-10 size-96 rounded-full bg-violet-200/35 blur-3xl"
          aria-hidden="true"
        />

        <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.94fr_1.06fr] lg:px-8 lg:py-24">
          <div className="lf-marketing-reveal">
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3.5 py-2 text-sm font-bold text-primary shadow-sm backdrop-blur-lg">
              <BadgeCheck size={17} aria-hidden="true" />
              {copy("marketing.badge")}
            </p>
            <h1 className="mt-6 max-w-3xl text-[clamp(2.4rem,7vw,4.5rem)] font-black leading-[1.02] tracking-[-0.045em] text-foreground">
              {copy("marketing.heroTitle")}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-foreground-muted sm:text-lg sm:leading-9">
              {copy("marketing.heroBody")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/get-started"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-[0_12px_28px_rgb(79_70_229/0.24)] transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_16px_34px_rgb(79_70_229/0.3)] active:translate-y-0"
              >
                {copy("marketing.primaryCta")}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="/features"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border-strong bg-white/80 px-5 py-3 font-bold text-foreground shadow-sm backdrop-blur-lg transition-[background-color,border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white active:translate-y-0"
              >
                {copy("marketing.secondaryCta")}
              </Link>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-foreground-subtle">
              {copy("marketing.trustLine")}
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

      <section
        aria-label={copy("marketing.trustSectionLabel")}
        className="border-b border-border bg-white"
      >
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {trustItems.map(([Icon, label]) => (
            <div
              key={label}
              className="flex min-h-24 items-center justify-center gap-3 bg-white px-4 py-5 text-center text-sm font-bold text-foreground-muted"
            >
              <Icon
                size={20}
                className="shrink-0 text-primary"
                aria-hidden="true"
              />
              <span>{copy(label)}</span>
            </div>
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
              {copy("marketing.howEyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {copy("marketing.howTitle")}
            </h2>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {workflow.map(([Icon, key], index) => (
              <li
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-[var(--lf-shadow-raised)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgb(30_41_59/0.1)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--lf-primary-soft)] text-primary">
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <span
                    dir="ltr"
                    className="text-4xl font-black text-slate-100"
                  >
                    0{index + 1}
                  </span>
                </div>
                <p className="mt-7 text-base font-bold leading-7 text-foreground-muted">
                  {copy(key)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="product"
        className="scroll-mt-24 border-y border-border bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
                {copy("marketing.featuresEyebrow")}
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {copy("marketing.featuresTitle")}
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-foreground-muted lg:justify-self-end">
              {copy("marketing.featuresBody")}
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {features.map(([Icon, titleKey, bodyKey]) => (
              <article
                key={titleKey}
                className="rounded-2xl border border-border bg-[var(--lf-marketing-canvas)] p-6 sm:p-7"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                  <Icon size={23} aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-black text-foreground">
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

      <section
        id="industries"
        className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
              {copy("marketing.industriesEyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {copy("marketing.industriesTitle")}
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map(([Icon, titleKey, bodyKey]) => (
              <article
                key={titleKey}
                className="group rounded-2xl border border-border bg-white p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_16px_34px_rgb(30_41_59/0.08)]"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-black text-foreground">
                  {copy(titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-7 text-foreground-muted">
                  {copy(bodyKey)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="security"
        className="scroll-mt-24 bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-indigo-300">
              {copy("marketing.securityEyebrow")}
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
              {copy("marketing.securityTitle")}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              {copy("marketing.securityBody")}
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_60px_rgb(0_0_0/0.2)] backdrop-blur-xl sm:p-7">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-indigo-400/15 text-indigo-300">
              <Fingerprint size={25} aria-hidden="true" />
            </div>
            <ul className="space-y-4">
              {securityPoints.map((key) => (
                <li
                  key={key}
                  className="flex gap-3 text-sm leading-7 text-slate-200"
                >
                  <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <Check size={14} aria-hidden="true" />
                  </span>
                  <span>{copy(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
              {copy("marketing.faqEyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {copy("marketing.faqTitle")}
            </h2>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {faq.map(([questionKey, answerKey], index) => (
              <details
                key={questionKey}
                className="group py-2"
                open={index === 0}
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 font-bold text-foreground marker:content-none">
                  <span>{copy(questionKey)}</span>
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-primary transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-5 text-sm leading-7 text-foreground-muted">
                  {copy(answerKey)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#312e81,#4f46e5_58%,#7c3aed)] px-6 py-12 text-white shadow-[0_28px_70px_rgb(49_46_129/0.24)] sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-14 lg:py-14">
          <div
            className="absolute -end-16 -top-24 size-64 rounded-full border-[38px] border-white/[0.07]"
            aria-hidden="true"
          />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              {copy("marketing.finalTitle")}
            </h2>
            <p className="mt-4 text-base leading-8 text-indigo-100">
              {copy("marketing.finalBody")}
            </p>
          </div>
          <div className="relative mt-8 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
            <Link
              href="/get-started"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-indigo-700 shadow-lg transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
            >
              {copy("marketing.primaryCta")}
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-bold text-white backdrop-blur-lg transition-colors hover:bg-white/15"
            >
              {copy("auth.signIn")}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
