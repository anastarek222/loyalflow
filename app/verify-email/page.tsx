import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { verifyEmailAction } from "@/app/verify-email/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";

export const metadata: Metadata = {
  title: { absolute: "Verify your email | Tanee" },
  applicationName: "Tanee",
  robots: { index: false, follow: false },
};

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
};

async function getAuthEntryLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const [params, locale] = await Promise.all([
    searchParams,
    getAuthEntryLocale(),
  ]);
  const direction = getLocaleDirection(locale);
  const token = params.token?.trim() ?? "";
  const invalid = params.error === "invalid-token" || token.length < 20;

  return (
    <main
      lang={locale}
      dir={direction}
      className="min-h-screen bg-surface-subtle px-4 py-12"
    >
      <div className="mx-auto max-w-lg rounded-[var(--lf-radius-card)] border border-border bg-white p-8 shadow-sm">
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

        <h1 className="text-2xl font-bold text-foreground">
          {translate(locale, "auth.verifyEmailTitle")}
        </h1>

        {invalid ? (
          <>
            <p className="mt-4 text-foreground-muted">
              {translate(locale, "auth.verifyEmailInvalid")}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block font-semibold text-primary hover:underline"
            >
              {translate(locale, "auth.backSignIn")}
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 text-foreground-muted">
              {translate(locale, "auth.verifyEmailBody")}
            </p>
            <form action={verifyEmailAction} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover"
              >
                {translate(locale, "auth.verifyEmailCta")}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
