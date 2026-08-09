import { auth } from "@/auth";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getMarketingLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();

  return {
    title: translate(locale, "marketing.metaTitle"),
    description: translate(locale, "marketing.metaDescription"),
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
  };
}

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const locale = await getMarketingLocale();
  const direction = getLocaleDirection(locale);

  const features = [
    ["marketing.featureOneTitle", "marketing.featureOneBody"],
    ["marketing.featureTwoTitle", "marketing.featureTwoBody"],
    ["marketing.featureThreeTitle", "marketing.featureThreeBody"],
  ] as const;

  const workflow = [
    "marketing.workflowOne",
    "marketing.workflowTwo",
    "marketing.workflowThree",
  ] as const;

  return (
    <main lang={locale} dir={direction} className="min-h-screen bg-surface-subtle text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
          <Link href="/" className="text-xl font-black tracking-tight">
            {translate(locale, "common.brand")}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <Link
              href="/login"
              className="rounded-[var(--lf-radius-input)] bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {translate(locale, "auth.signIn")}
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted">
              {translate(locale, "marketing.badge")}
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {translate(locale, "marketing.heroTitle")}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-foreground-muted sm:text-lg">
              {translate(locale, "marketing.heroBody")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
              >
                {translate(locale, "marketing.primaryCta")}
              </Link>
              <Link
                href="/accept-owner-invitation"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] border border-border bg-surface px-5 py-3 font-semibold text-foreground transition hover:bg-surface-subtle"
              >
                {translate(locale, "marketing.invitationCta")}
              </Link>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-foreground-subtle">
              {translate(locale, "marketing.trustLine")}
            </p>
          </div>

          <div className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black">{translate(locale, "marketing.workflowTitle")}</h2>
            <ol className="mt-6 space-y-5">
              {workflow.map((key, index) => (
                <li key={key} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-7 text-foreground-muted">{translate(locale, key)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid gap-4 pb-14 md:grid-cols-3">
          {features.map(([titleKey, bodyKey]) => (
            <article key={titleKey} className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-6">
              <h2 className="text-lg font-black">{translate(locale, titleKey)}</h2>
              <p className="mt-3 text-sm leading-7 text-foreground-muted">{translate(locale, bodyKey)}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
