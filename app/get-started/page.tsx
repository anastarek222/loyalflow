import { MarketingBrandText } from "@/components/marketing/marketing-brand-text";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { PublicTrialForm } from "@/components/public-trial-form";
import { PUBLIC_ACQUISITION_MODE } from "@/lib/acquisition/public-mode";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { startPublicTrialAction } from "./actions";

async function getConversionLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getConversionLocale();
  const title = translate(locale, "conversion.metaTitle");
  const description = translate(locale, "conversion.metaDescription");

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/get-started" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({
      title,
      description,
      path: "/get-started",
    }),
  };
}

export default async function GetStartedPage() {
  const locale = await getConversionLocale();
  const direction = getLocaleDirection(locale);

  return (
    <main
      lang={locale}
      dir={direction}
      className="lf-marketing-surface min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] text-foreground [overflow-wrap:anywhere]"
    >
      <MarketingHeader
        locale={locale}
        brand={translate(locale, "common.brand")}
        signIn={translate(locale, "auth.signIn")}
        primaryCta={translate(locale, "marketing.primaryCta")}
        menuLabel={translate(locale, "marketing.menuOpen")}
        closeLabel={translate(locale, "marketing.menuClose")}
        navigation={getPublicMarketingNavigation(locale)}
      />
      <div
        data-acquisition-mode={PUBLIC_ACQUISITION_MODE}
        className="mx-auto w-full max-w-5xl px-4 sm:px-6"
      >
        <section className="py-12 sm:py-16">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-primary">
            <MarketingBrandText text={translate(locale, "conversion.eyebrow")} />
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
            <MarketingBrandText text={translate(locale, "conversion.title")} />
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-foreground-muted sm:text-lg">
            <MarketingBrandText text={translate(locale, "conversion.body")} />
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="flex flex-col rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
              <h2 className="text-xl font-black">
                <MarketingBrandText text={translate(locale, "conversion.invitedTitle")} />
              </h2>
              <p className="mt-3 text-sm leading-7 text-foreground-muted">
                <MarketingBrandText text={translate(locale, "conversion.invitedBody")} />
              </p>
              <div className="mt-6">
                <PublicTrialForm
                  locale={locale}
                  action={startPublicTrialAction}
                />
              </div>
            </article>

            <article className="flex min-h-64 flex-col rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
              <h2 className="text-xl font-black">
                <MarketingBrandText text={translate(locale, "conversion.existingTitle")} />
              </h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-foreground-muted">
                <MarketingBrandText text={translate(locale, "conversion.existingBody")} />
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover"
              >
                <MarketingBrandText text={translate(locale, "conversion.existingCta")} />
              </Link>
            </article>
          </div>

          <div
            role="note"
            data-secure-setup-continuation="email-only"
            className="mt-6 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-3 text-sm text-foreground-muted"
          >
            <MarketingBrandText text={translate(locale, "conversion.noSignup")} />
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            <MarketingBrandText text={translate(locale, "conversion.backHome")} />
          </Link>
        </section>
      </div>
      <MarketingFooter locale={locale} />
    </main>
  );
}
