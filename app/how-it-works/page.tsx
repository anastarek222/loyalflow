import { MarketingBrandText } from "@/components/marketing/marketing-brand-text";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection, type SupportedLocale } from "@/lib/i18n/config";
import {
  getMarketingHowItWorksCopy,
  type HowItWorksStep,
  type HowItWorksStepId,
} from "@/lib/marketing/how-it-works";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import type { Metadata } from "next";
import { Alexandria, Libre_Bodoni } from "next/font/google";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronDown,
  CircleUserRound,
  CreditCard,
  Gift,
  HeartHandshake,
  History,
  LineChart,
  Palette,
  QrCode,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stamp,
  UserPlus,
  Users,
  WalletCards,
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

const stepIcons = {
  setup: Settings2,
  join: UserPlus,
  activity: Activity,
  progress: LineChart,
  reward: Gift,
  relationship: HeartHandshake,
} satisfies Record<HowItWorksStepId, typeof Settings2>;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const pageCopy = getMarketingHowItWorksCopy(locale);

  return {
    title: pageCopy.metaTitle,
    description: pageCopy.metaDescription,
    alternates: { canonical: "/how-it-works" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({
      title: pageCopy.metaTitle,
      description: pageCopy.metaDescription,
      path: "/how-it-works",
    }),
  };
}

function PreviewFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className="relative overflow-hidden rounded-3xl border border-border bg-white p-5 shadow-[var(--lf-shadow-raised)] sm:p-7"
    >
      <div className="absolute -end-20 -top-20 size-52 rounded-full border border-primary/15" />
      <div className="relative">{children}</div>
    </div>
  );
}

function HeroWorkflowPreview({
  locale,
  label,
  title,
  steps,
}: {
  locale: SupportedLocale;
  label: string;
  title: string;
  steps: readonly HowItWorksStep[];
}) {
  return (
    <PreviewFrame label={label}>
      <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-primary">
            <MarketingBrandText text={label} />
          </p>
          <p className="mt-1 font-black"><MarketingBrandText text={title} /></p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
          <Sparkles size={20} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {steps.map((step, index) => {
          const Icon = stepIcons[step.id];
          return (
            <div
              key={step.id}
              className="relative min-w-0 rounded-2xl border border-border bg-surface-subtle p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span
                  dir="ltr"
                  className="text-xs font-black text-foreground-subtle"
                >
                  0{index + 1}
                </span>
              </div>
              <p className="mt-4 text-sm font-bold leading-6">
                <MarketingBrandText text={step.shortTitle} />
              </p>
              {index < steps.length - 1 ? (
                <span className="absolute -bottom-2 start-1/2 z-10 hidden size-4 -translate-x-1/2 rotate-45 border-b border-e border-border bg-surface-subtle sm:block rtl:translate-x-1/2" />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-[var(--lf-primary-foreground)]">
        <BadgeCheck size={19} className="shrink-0" aria-hidden="true" />
        <p className="text-sm font-bold">
          {locale === "ar"
            ? "سجل واحد يربط النشاط والتقدّم والمكافآت"
            : "One record connects activity, progress and rewards"}
        </p>
      </div>
    </PreviewFrame>
  );
}

function StagePreview({
  id,
  locale,
  businessView,
  customerView,
  customerContext,
  activityHistory,
  progressRewards,
  engagementSignals,
}: {
  id: HowItWorksStepId;
  locale: SupportedLocale;
  businessView: string;
  customerView: string;
  customerContext: string;
  activityHistory: string;
  progressRewards: string;
  engagementSignals: string;
}) {
  const ar = locale === "ar";

  if (id === "setup") {
    return (
      <PreviewFrame
        label={ar ? "إعداد برنامج الولاء" : "Loyalty programme setup"}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              {ar ? "إعداد البرنامج" : "Programme setup"}
            </p>
            <p className="mt-1 text-lg font-black">Nile Brew Café</p>
          </div>
          <Settings2 size={22} className="text-primary" aria-hidden="true" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            ar ? "زيارات" : "Visits",
            ar ? "نقاط" : "Points",
            ar ? "مبيعات" : "Sales",
          ].map((item, index) => (
            <div
              key={item}
              className={`rounded-xl border p-3 text-center text-xs font-bold ${
                index === 0
                  ? "border-primary bg-[var(--lf-primary-soft)] text-primary"
                  : "border-border bg-surface-subtle text-foreground-muted"
              }`}
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-border bg-surface-subtle p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold">
              {ar ? "مكافأة بعد" : "Reward after"}
            </span>
            <span dir="ltr" className="text-lg font-black text-primary">
              5 {ar ? "زيارات" : "visits"}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {["#FF6652", "#FFB547", "#78E3C5", "#171717"].map((color) => (
              <span
                key={color}
                className="size-7 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
            ))}
            <Palette
              size={18}
              className="ms-auto text-foreground-muted"
              aria-hidden="true"
            />
          </div>
        </div>
      </PreviewFrame>
    );
  }

  if (id === "join") {
    return (
      <PreviewFrame label={ar ? "انضمام العميل" : "Customer joining"}>
        <div className="grid items-center gap-4 sm:grid-cols-[0.8fr_1.2fr]">
          <div className="mx-auto w-full max-w-48 rounded-[1.75rem] border border-border bg-surface-subtle p-3 shadow-[var(--lf-shadow-soft)]">
            <div className="rounded-2xl bg-white p-4 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
                <QrCode size={27} aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm font-black">Nile Brew Café</p>
              <p className="mt-1 text-[11px] leading-5 text-foreground-muted">
                {ar ? "انضم إلى برنامج الولاء" : "Join the loyalty programme"}
              </p>
              <span className="mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-primary px-3 text-xs font-black text-[var(--lf-primary-foreground)]">
                {ar ? "انضم الآن" : "Join now"}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-primary p-5 text-[var(--lf-primary-foreground)]">
            <div className="flex items-start justify-between gap-3">
              <CreditCard size={24} aria-hidden="true" />
              <QrCode size={38} aria-hidden="true" />
            </div>
            <p className="mt-8 text-xs font-bold opacity-70">
              {ar ? "المكافأة التالية" : "Next reward"}
            </p>
            <p className="mt-1 font-black">
              {ar ? "مشروب مميز مجانًا" : "Free signature drink"}
            </p>
            <div className="mt-5 flex items-end justify-between gap-3">
              <span className="text-xs font-bold">Ahmed Mohamed</span>
              <span dir="ltr" className="text-xl font-black">
                1 / 5
              </span>
            </div>
          </div>
        </div>
      </PreviewFrame>
    );
  }

  if (id === "activity") {
    const rows = [
      [ar ? "زيارة مؤهلة" : "Eligible visit", "+1", "12:42"],
      [ar ? "قيمة مبيعات" : "Sales amount", "+250", "11:18"],
      [ar ? "نقاط" : "Points", "+20", "09:36"],
    ];
    return (
      <PreviewFrame
        label={ar ? "سجل نشاط العميل" : "Customer activity history"}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              {activityHistory}
            </p>
            <p className="mt-1 font-black">Ahmed Mohamed</p>
          </div>
          <History size={21} className="text-primary" aria-hidden="true" />
        </div>
        <div className="mt-4 grid gap-3">
          {rows.map(([name, value, time]) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface-subtle p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary">
                <Check size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{name}</p>
                <p dir="ltr" className="mt-0.5 text-xs text-foreground-subtle">
                  {time}
                </p>
              </div>
              <span dir="ltr" className="text-sm font-black text-primary">
                {value}
              </span>
            </div>
          ))}
        </div>
      </PreviewFrame>
    );
  }

  if (id === "progress") {
    return (
      <PreviewFrame label={ar ? "تقدم العميل" : "Customer progress"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-subtle p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              {businessView}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white p-3">
                <Users size={17} className="text-primary" aria-hidden="true" />
                <p dir="ltr" className="mt-3 text-xl font-black">
                  4 / 5
                </p>
                <p className="mt-1 text-[11px] text-foreground-muted">
                  {progressRewards}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <Activity
                  size={17}
                  className="text-primary"
                  aria-hidden="true"
                />
                <p dir="ltr" className="mt-3 text-xl font-black">
                  8
                </p>
                <p className="mt-1 text-[11px] text-foreground-muted">
                  {activityHistory}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-primary p-5 text-[var(--lf-primary-foreground)]">
            <p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">
              {customerView}
            </p>
            <p className="mt-5 text-sm font-bold">Ahmed Mohamed</p>
            <p className="mt-2 text-3xl font-black" dir="ltr">
              4 / 5
            </p>
            <div className="mt-4 h-2 rounded-full bg-black/15">
              <div className="h-full w-4/5 rounded-full bg-white" />
            </div>
            <p className="mt-3 text-xs font-bold opacity-75">
              {ar ? "زيارة واحدة للمكافأة" : "One visit to reward"}
            </p>
          </div>
        </div>
      </PreviewFrame>
    );
  }

  if (id === "reward") {
    return (
      <PreviewFrame label={ar ? "المكافآت المتاحة" : "Available rewards"}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              {ar ? "مكافأة جاهزة" : "Reward ready"}
            </p>
            <p className="mt-1 text-lg font-black">
              {ar ? "مشروب مميز مجانًا" : "Free signature drink"}
            </p>
          </div>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--lf-primary-soft)] text-primary">
            <Gift size={22} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-surface-subtle p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-bold">Ahmed Mohamed</span>
            <BadgeCheck size={20} className="text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                className="flex aspect-square items-center justify-center rounded-xl bg-primary text-[var(--lf-primary-foreground)]"
              >
                <Stamp size={17} aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-black text-[var(--lf-primary-foreground)]">
          {ar ? "تأكيد استخدام المكافأة" : "Confirm reward redemption"}
        </div>
      </PreviewFrame>
    );
  }

  const metrics = [
    [customerContext, CircleUserRound, ar ? "نشط" : "Active"],
    [activityHistory, History, "18"],
    [progressRewards, WalletCards, "2"],
    [engagementSignals, BarChart3, "+24%"],
  ] as const;
  return (
    <PreviewFrame
      label={ar ? "سياق علاقة العميل" : "Customer relationship context"}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
            {ar ? "ملف العميل" : "Customer profile"}
          </p>
          <p className="mt-1 font-black">Ahmed Mohamed</p>
        </div>
        <HeartHandshake size={22} className="text-primary" aria-hidden="true" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {metrics.map(([label, Icon, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-surface-subtle p-4"
          >
            <Icon size={18} className="text-primary" aria-hidden="true" />
            <p className="mt-3 text-xs leading-5 text-foreground-muted">
              <MarketingBrandText text={label} />
            </p>
            <p dir="ltr" className="mt-1 text-lg font-black">
              {value}
            </p>
          </div>
        ))}
      </div>
    </PreviewFrame>
  );
}

export default async function HowItWorksPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const t = (key: MessageKey) => translate(locale, key);
  const pageCopy = getMarketingHowItWorksCopy(locale);
  const navigation = getPublicMarketingNavigation(locale);
  const editorial =
    locale === "en"
      ? "[font-family:var(--font-marketing-editorial)]"
      : "[font-family:var(--font-marketing-sans)]";

  return (
    <main
      lang={locale}
      dir={direction}
      className={`${marketingSans.variable} ${marketingEditorial.variable} lf-marketing-surface min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] font-[family-name:var(--font-marketing-sans)] text-foreground [overflow-wrap:anywhere]`}
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

      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-12 lg:px-10 lg:py-28">
          <div className="lg:col-span-7 lg:pe-10">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-foreground-muted">
              <span className="size-2 rounded-full bg-primary" />
              <MarketingBrandText text={pageCopy.eyebrow} />
            </p>
            <h1
              className={`mt-5 max-w-3xl text-[clamp(2.35rem,4.7vw,4.25rem)] font-semibold leading-[1.08] tracking-[-0.025em] ${editorial}`}
            >
              <MarketingBrandText text={pageCopy.title} />
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-foreground-muted sm:text-lg sm:leading-9">
              <MarketingBrandText text={pageCopy.body} />
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/get-started"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3 font-bold text-[var(--lf-primary-foreground)] transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] focus-visible:ring-offset-2"
              >
                <MarketingBrandText text={pageCopy.primaryCta} />
                <ArrowUpRight
                  size={18}
                  className="rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/features"
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-border-strong px-7 py-3 font-bold transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
              >
                <MarketingBrandText text={pageCopy.secondaryCta} />
              </Link>
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-foreground-subtle">
              <BadgeCheck
                size={18}
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <MarketingBrandText text={pageCopy.trialNote} />
            </p>
          </div>
          <div className="lg:col-span-5">
            <HeroWorkflowPreview
              locale={locale}
              label={pageCopy.previewLabel}
              title={pageCopy.previewTitle}
              steps={pageCopy.steps}
            />
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              className={`text-3xl font-semibold leading-tight sm:text-5xl ${editorial}`}
            >
              <MarketingBrandText text={pageCopy.journeyTitle} />
            </h2>
            <p className="mt-5 text-base leading-8 text-foreground-muted sm:text-lg">
              <MarketingBrandText text={pageCopy.journeyBody} />
            </p>
          </div>
          <ol className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {pageCopy.steps.map((step, index) => {
              const Icon = stepIcons[step.id];
              return (
                <li
                  key={step.id}
                  className="relative rounded-2xl border border-border bg-white p-5 shadow-[var(--lf-shadow-soft)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span
                      dir="ltr"
                      className="text-xs font-black text-foreground-subtle"
                    >
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-5 text-sm font-bold leading-6">
                    <MarketingBrandText text={step.shortTitle} />
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <div className="border-y border-border bg-surface">
        {pageCopy.steps.map((step, index) => {
          const Icon = stepIcons[step.id];
          return (
            <section
              key={step.id}
              className={index > 0 ? "border-t border-border" : undefined}
            >
              <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-28">
                <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                  <p className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.13em] text-primary">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)]">
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <MarketingBrandText text={pageCopy.stepLabel} />{" "}{String(index + 1).padStart(2, "0")}
                  </p>
                  <h2
                    className={`mt-6 text-3xl font-semibold leading-tight sm:text-4xl ${editorial}`}
                  >
                    <MarketingBrandText text={step.title} />
                  </h2>
                  <p className="mt-5 text-base leading-8 text-foreground-muted">
                    <MarketingBrandText text={step.body} />
                  </p>
                  <ul className="mt-8 grid gap-4">
                    {step.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-3 text-sm font-semibold leading-7"
                      >
                        <Check
                          size={18}
                          className="mt-1 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <MarketingBrandText text={bullet} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={index % 2 === 1 ? "lg:order-1" : undefined}>
                  <StagePreview
                    id={step.id}
                    locale={locale}
                    businessView={pageCopy.businessView}
                    customerView={pageCopy.customerView}
                    customerContext={pageCopy.customerContext}
                    activityHistory={pageCopy.activityHistory}
                    progressRewards={pageCopy.progressRewards}
                    engagementSignals={pageCopy.engagementSignals}
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="bg-[#171717] px-5 py-20 text-[#fff9f5] sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`text-3xl font-semibold sm:text-5xl ${editorial}`}>
              <MarketingBrandText text={pageCopy.balanceTitle} />
            </h2>
            <p className="mt-5 text-base leading-8 text-[#c7bfba] sm:text-lg">
              <MarketingBrandText text={pageCopy.balanceBody} />
            </p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-[#3b3633] bg-[#1f1d1c] p-7 sm:p-9">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#30201d] text-[#ff7a68]">
                <CreditCard size={23} aria-hidden="true" />
              </span>
              <h3 className={`mt-7 text-3xl font-semibold ${editorial}`}>
                <MarketingBrandText text={pageCopy.customerExperienceTitle} />
              </h3>
              <ul className="mt-7 grid gap-4 text-sm leading-7 text-[#d7cbc5]">
                {[
                  pageCopy.customerView,
                  pageCopy.progressRewards,
                  pageCopy.customerContext,
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check
                      size={18}
                      className="mt-1 shrink-0 text-[#ff7a68]"
                      aria-hidden="true"
                    />
                    <MarketingBrandText text={item} />
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-3xl border border-[#3b3633] bg-[#1f1d1c] p-7 sm:p-9">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#30201d] text-[#ff7a68]">
                <BarChart3 size={23} aria-hidden="true" />
              </span>
              <h3 className={`mt-7 text-3xl font-semibold ${editorial}`}>
                <MarketingBrandText text={pageCopy.businessExperienceTitle} />
              </h3>
              <ul className="mt-7 grid gap-4 text-sm leading-7 text-[#d7cbc5]">
                {[
                  pageCopy.activityHistory,
                  pageCopy.engagementSignals,
                  pageCopy.businessView,
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check
                      size={18}
                      className="mt-1 shrink-0 text-[#ff7a68]"
                      aria-hidden="true"
                    />
                    <MarketingBrandText text={item} />
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              <MarketingBrandText text={pageCopy.teamEyebrow} />
            </p>
            <h2
              className={`mt-4 text-3xl font-semibold leading-tight sm:text-5xl ${editorial}`}
            >
              <MarketingBrandText text={pageCopy.teamTitle} />
            </h2>
            <p className="mt-5 text-base leading-8 text-foreground-muted sm:text-lg">
              <MarketingBrandText text={pageCopy.teamBody} />
            </p>
          </div>
          <ol className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {pageCopy.teamSteps.map((step, index) => {
              const icons = [
                ScanLine,
                Activity,
                BadgeCheck,
                HeartHandshake,
              ] as const;
              const Icon = icons[index];
              return (
                <li
                  key={step.title}
                  className="rounded-2xl border border-border bg-white p-6 shadow-[var(--lf-shadow-soft)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span
                      dir="ltr"
                      className="text-xs font-black text-foreground-subtle"
                    >
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-black leading-7">
                    <MarketingBrandText text={step.title} />
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-foreground-muted">
                    <MarketingBrandText text={step.body} />
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="border-y border-border bg-surface px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-[2rem] border border-border bg-white shadow-[var(--lf-shadow-raised)]">
            <div className="relative flex size-40 items-center justify-center rounded-full border border-primary/20 bg-[var(--lf-primary-soft)] text-primary">
              <ShieldCheck size={64} aria-hidden="true" />
              <span className="absolute -end-3 top-4 flex size-11 items-center justify-center rounded-2xl border border-border bg-white shadow-[var(--lf-shadow-soft)]">
                <Users size={20} aria-hidden="true" />
              </span>
              <span className="absolute -bottom-2 start-6 flex size-11 items-center justify-center rounded-2xl border border-border bg-white shadow-[var(--lf-shadow-soft)]">
                <History size={20} aria-hidden="true" />
              </span>
            </div>
          </div>
          <div>
            <h2
              className={`text-3xl font-semibold leading-tight sm:text-5xl ${editorial}`}
            >
              <MarketingBrandText text={pageCopy.controlTitle} />
            </h2>
            <p className="mt-5 text-base leading-8 text-foreground-muted sm:text-lg">
              <MarketingBrandText text={pageCopy.controlBody} />
            </p>
            <ul className="mt-8 grid gap-4">
              {pageCopy.controlPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 font-semibold leading-7"
                >
                  <ShieldCheck
                    size={19}
                    className="mt-1 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <MarketingBrandText text={point} />
                </li>
              ))}
            </ul>
            <Link
              href="/privacy"
              className="mt-8 inline-flex min-h-11 items-center gap-2 font-bold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
            >
              {t("marketing.navPrivacy")}
              <ArrowUpRight
                size={17}
                className="rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto w-full max-w-4xl">
          <h2
            className={`text-center text-3xl font-semibold sm:text-5xl ${editorial}`}
          >
            <MarketingBrandText text={pageCopy.faqTitle} />
          </h2>
          <div className="mt-12 divide-y divide-border border-y border-border">
            {pageCopy.faqs.map((item, index) => (
              <details
                key={item.question}
                className="group py-1"
                open={index === 0}
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 rounded-xl px-3 py-4 font-bold leading-7 transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] [&::-webkit-details-marker]:hidden">
                  <span><MarketingBrandText text={item.question} /></span>
                  <ChevronDown
                    size={19}
                    className="shrink-0 text-primary transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="max-w-3xl px-3 pb-6 pe-12 text-sm leading-7 text-foreground-muted">
                  <MarketingBrandText text={item.answer} />
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#171717] px-5 py-20 text-center text-[#fff9f5] sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff7a68]">
            <MarketingBrandText text={pageCopy.finalEyebrow} />
          </p>
          <h2
            className={`mt-4 text-3xl font-semibold leading-tight sm:text-5xl ${editorial}`}
          >
            <MarketingBrandText text={pageCopy.finalTitle} />
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#c7bfba] sm:text-lg">
            <MarketingBrandText text={pageCopy.finalBody} />
          </p>
          <Link
            href="/get-started"
            className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#ff6652] px-8 py-3 font-black text-[#171717] transition hover:bg-[#ff7a68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8d7d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717]"
          >
            <MarketingBrandText text={pageCopy.primaryCta} />
            <ArrowUpRight
              size={18}
              className="rtl:-scale-x-100"
              aria-hidden="true"
            />
          </Link>
          <p className="mt-4 text-sm text-[#aa9e98]"><MarketingBrandText text={pageCopy.trialNote} /></p>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
