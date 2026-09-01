import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";

import { forgotPasswordAction } from "./actions";

export const metadata: Metadata = {
  title: { absolute: "Reset your password | Tanee" },
  applicationName: "Tanee",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    sent?: string | string[];
  }>;
};

async function getAuthEntryLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const [params, locale] = await Promise.all([
    searchParams,
    getAuthEntryLocale(),
  ]);
  const direction = getLocaleDirection(locale);
  const sent =
    params.sent === "1" ||
    (Array.isArray(params.sent) && params.sent.includes("1"));

  return (
    <main
      lang={locale}
      dir={direction}
      className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 sm:px-6"
    >
      <section className="w-full max-w-md rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-h-11 items-center">
            <PlatformBrandIdentity
              locale={locale}
              fallback="letters"
              markClassName="hidden"
              wordmarkClassName="h-5 max-w-32"
              textClassName="font-black text-foreground"
            />
          </Link>
          <LanguageSwitcher locale={locale} />
        </div>

        <div className="mb-7">
          <h1 className="text-2xl font-black text-foreground">
            {translate(locale, "auth.resetRequestTitle")}
          </h1>
          <p className="mt-2 text-sm text-foreground-subtle">
            {translate(locale, "auth.resetRequestBody")}
          </p>
        </div>

        {sent ? (
          <div className="mb-5 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-3 text-sm text-foreground-muted">
            {translate(locale, "auth.resetRequestSent")}
          </div>
        ) : null}

        <form action={forgotPasswordAction} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
              {translate(locale, "auth.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <button
            type="submit"
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            {translate(locale, "auth.sendResetInstructions")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            {translate(locale, "auth.backSignIn")}
          </Link>
        </p>
      </section>
    </main>
  );
}
