import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { loyalFlowPlans, planCatalog } from "@/lib/entitlements";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

const pricedResources = [
  "CUSTOMERS",
  "USERS",
  "BRANCHES",
  "OFFERS",
  "REWARDS",
] as const;

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

export default async function PricingPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const navigation = getPublicMarketingNavigation(locale);
  const resourceLabels = {
    CUSTOMERS: copy("marketing.pricing.customers"),
    USERS: copy("marketing.pricing.users"),
    BRANCHES: copy("marketing.pricing.branches"),
    OFFERS: copy("marketing.pricing.offers"),
    REWARDS: copy("marketing.pricing.rewards"),
  } as const;

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
      <section className="border-b border-border bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-7xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">{copy("marketing.pricing.eyebrow")}</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">{copy("marketing.pricing.title")}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-foreground-muted">{copy("marketing.pricing.body")}</p>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid w-full max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">
          {loyalFlowPlans.map((plan) => {
            const definition = planCatalog[plan];
            const isFree = plan === "FREE";
            return (
              <article key={plan} className={`flex flex-col rounded-[1.35rem] border bg-white p-6 shadow-[0_18px_45px_rgb(15_23_42/0.06)] ${isFree ? "border-primary ring-2 ring-primary/10" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{isFree ? copy("marketing.pricing.freeLabel") : copy("marketing.pricing.betaLabel")}</p>
                    <h2 className="mt-2 text-2xl font-black">{definition.name}</h2>
                  </div>
                  {isFree ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">0</span> : null}
                </div>
                <p className="mt-4 min-h-12 text-sm font-semibold leading-6 text-foreground-muted">{isFree ? copy("marketing.pricing.freeLabel") : copy("marketing.pricing.confirmedAtSetup")}</p>
                <ul className="mt-6 flex-1 space-y-3 border-t border-border pt-5">
                  {pricedResources.map((resource) => {
                    const limit = definition.limits[resource];
                    return (
                    <li key={resource} className="flex items-center gap-2 text-sm text-foreground-muted">
                      <Check size={16} className="shrink-0 text-primary" aria-hidden="true" />
                      <span><strong className="text-foreground">{limit === null ? copy("marketing.pricing.unlimited") : limit.toLocaleString(locale)}</strong> {resourceLabels[resource as keyof typeof resourceLabels]}</span>
                    </li>
                    );
                  })}
                </ul>
                <Link href="/get-started" className={`mt-7 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold ${isFree ? "bg-primary text-white" : "border border-border bg-surface-subtle text-foreground"}`}>{copy("marketing.pricing.cta")}</Link>
              </article>
            );
          })}
        </div>
        <div className="mx-auto mt-10 w-full max-w-7xl rounded-[1.35rem] border border-indigo-200 bg-indigo-50 p-6 sm:p-8">
          <h2 className="text-xl font-black text-indigo-950">{copy("marketing.pricing.noteTitle")}</h2>
          <p className="mt-3 max-w-4xl leading-7 text-indigo-900/75">{copy("marketing.pricing.noteBody")}</p>
        </div>
      </section>
      <MarketingFooter locale={locale} />
    </main>
  );
}
