import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PUBLIC_ACQUISITION_MODE } from "@/lib/acquisition/public-mode";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

async function getConversionLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getConversionLocale();
  const title = translate(locale, "conversion.metaTitle");
  const description = translate(locale, "conversion.metaDescription");

  return {
    title,
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
    <main lang={locale} dir={direction} className="min-h-screen bg-surface-subtle px-4 py-8 text-foreground sm:px-6">
      <div
        data-acquisition-mode={PUBLIC_ACQUISITION_MODE}
        className="mx-auto w-full max-w-5xl"
      >
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <Link href="/" className="text-xl font-black tracking-tight">
            {translate(locale, "common.brand")}
          </Link>
          <LanguageSwitcher locale={locale} />
        </header>

        <section className="py-12 sm:py-16">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-primary">
            {translate(locale, "conversion.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
            {translate(locale, "conversion.title")}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-foreground-muted sm:text-lg">
            {translate(locale, "conversion.body")}
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="flex min-h-64 flex-col rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-black">{translate(locale, "conversion.existingTitle")}</h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-foreground-muted">
                {translate(locale, "conversion.existingBody")}
              </p>
              <Link href="/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover">
                {translate(locale, "conversion.existingCta")}
              </Link>
            </article>

            <article className="flex min-h-64 flex-col rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-black">{translate(locale, "conversion.invitedTitle")}</h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-foreground-muted">
                {translate(locale, "conversion.invitedBody")}
              </p>
              <Link href="/accept-owner-invitation" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-5 py-3 font-semibold text-foreground hover:bg-surface">
                {translate(locale, "conversion.invitedCta")}
              </Link>
            </article>
          </div>

          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-3 text-sm text-foreground-muted">
            {translate(locale, "conversion.noSignup")}
          </div>

          <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-primary hover:underline">
            {translate(locale, "conversion.backHome")}
          </Link>
        </section>
      </div>
    </main>
  );
}
