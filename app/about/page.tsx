import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import { ScanLine, Store, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const title = translate(locale, "marketing.about.metaTitle");
  const description = translate(locale, "marketing.about.metaDescription");
  return { title, description, alternates: { canonical: "/about" }, robots: { index: true, follow: true }, ...buildPublicSocialMetadata({ title, description, path: "/about" }) };
}

export default async function AboutPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const principles = [
    [Users, "marketing.about.customerTitle", "marketing.about.customerBody"],
    [ScanLine, "marketing.about.teamTitle", "marketing.about.teamBody"],
    [Store, "marketing.about.businessTitle", "marketing.about.businessBody"],
  ] as const;
  return (
    <main lang={locale} dir={direction} className="min-h-screen bg-[var(--lf-marketing-canvas)] text-foreground">
      <MarketingHeader locale={locale} brand={copy("common.brand")} signIn={copy("auth.signIn")} primaryCta={copy("marketing.primaryCta")} menuLabel={copy("marketing.menuOpen")} closeLabel={copy("marketing.menuClose")} navigation={getPublicMarketingNavigation(locale)} />
      <section className="border-b border-border bg-[linear-gradient(180deg,#ffffff,#f5f7ff)] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">{copy("marketing.about.eyebrow")}</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">{copy("marketing.about.title")}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-foreground-muted">{copy("marketing.about.body")}</p>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid w-full max-w-7xl gap-5 md:grid-cols-3">
          {principles.map(([Icon, titleKey, bodyKey]) => (
            <article key={titleKey} className="rounded-[1.35rem] border border-border bg-white p-7 shadow-[0_18px_45px_rgb(15_23_42/0.06)]">
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={23} aria-hidden="true" /></span>
              <h2 className="mt-5 text-xl font-black">{copy(titleKey)}</h2>
              <p className="mt-3 text-sm leading-7 text-foreground-muted">{copy(bodyKey)}</p>
            </article>
          ))}
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-7xl flex-col gap-6 rounded-[1.5rem] bg-slate-950 p-7 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl"><h2 className="text-2xl font-black">{copy("marketing.about.ctaTitle")}</h2><p className="mt-3 leading-7 text-slate-300">{copy("marketing.about.ctaBody")}</p></div>
          <Link href="/get-started" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 font-bold text-slate-950">{copy("marketing.primaryCta")}</Link>
        </div>
      </section>
      <MarketingFooter locale={locale} />
    </main>
  );
}
