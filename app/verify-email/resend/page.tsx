import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";

import { resendEmailVerificationAction } from "./actions";

export const metadata: Metadata = {
  title: { absolute: "Resend verification email | Tanee" },
  applicationName: "Tanee",
  robots: { index: false, follow: false },
};

async function getAuthEntryLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export default async function ResendEmailVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const [{ sent }, locale] = await Promise.all([
    searchParams,
    getAuthEntryLocale(),
  ]);
  const direction = getLocaleDirection(locale);

  return (
    <main
      lang={locale}
      dir={direction}
      className="min-h-screen bg-surface-subtle px-4 py-12"
    >
      <section className="mx-auto w-full max-w-md rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
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

        <h1 className="text-2xl font-semibold text-foreground">
          {translate(locale, "auth.resendVerificationTitle")}
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {translate(locale, "auth.resendVerificationBody")}
        </p>

        {sent === "1" ? (
          <p className="mt-6 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-3 text-sm text-foreground-muted">
            {translate(locale, "auth.resendVerificationSent")}
          </p>
        ) : null}

        <form action={resendEmailVerificationAction} className="mt-6 space-y-4">
          <label
            className="block text-sm font-medium text-foreground-muted"
            htmlFor="email"
          >
            {translate(locale, "auth.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            dir="ltr"
            className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
          />
          <button
            type="submit"
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            {translate(locale, "auth.sendVerificationLink")}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-6 inline-flex text-sm font-semibold text-primary hover:underline"
        >
          {translate(locale, "auth.backSignIn")}
        </Link>
      </section>
    </main>
  );
}
