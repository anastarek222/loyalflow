import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Languages,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

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

export default async function FeaturesPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const navigation = getPublicMarketingNavigation(locale);
  const features = [
    [QrCode, "marketing.features.cardsTitle", "marketing.features.cardsBody"],
    [ScanLine, "marketing.features.staffTitle", "marketing.features.staffBody"],
    [Users, "marketing.features.customersTitle", "marketing.features.customersBody"],
    [Sparkles, "marketing.features.rewardsTitle", "marketing.features.rewardsBody"],
    [BarChart3, "marketing.features.reportingTitle", "marketing.features.reportingBody"],
    [ShieldCheck, "marketing.features.controlTitle", "marketing.features.controlBody"],
  ] as const;

  return (
    <main
      lang={locale}
      dir={direction}
      className="min-h-screen bg-[var(--lf-marketing-canvas)] text-foreground"
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

      <section className="border-b border-border/70 bg-[radial-gradient(circle_at_75%_15%,#e0e7ff_0,transparent_34%),linear-gradient(180deg,#ffffff,#f7f8fc)] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-7xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3.5 py-2 text-sm font-bold text-primary shadow-sm">
            <Languages size={17} aria-hidden="true" />
            {copy("marketing.features.eyebrow")}
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            {copy("marketing.features.title")}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-foreground-muted">
            {copy("marketing.features.body")}
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid w-full max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map(([Icon, titleKey, bodyKey]) => (
            <article
              key={titleKey}
              className="rounded-[1.35rem] border border-border bg-white p-6 shadow-[0_18px_45px_rgb(15_23_42/0.06)] sm:p-7"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-black">{copy(titleKey)}</h2>
              <p className="mt-3 text-sm leading-7 text-foreground-muted">
                {copy(bodyKey)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 rounded-[1.5rem] bg-slate-950 px-6 py-10 text-white sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black sm:text-3xl">
              {copy("marketing.features.ctaTitle")}
            </h2>
            <p className="mt-3 leading-7 text-slate-300">
              {copy("marketing.features.ctaBody")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
            >
              {copy("marketing.primaryCta")}
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-5 py-3 font-bold text-white"
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
