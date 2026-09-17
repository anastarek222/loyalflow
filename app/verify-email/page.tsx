import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { verifyEmailAction } from "@/app/verify-email/actions";
import { AuthEntryShell } from "@/components/auth/auth-entry-shell";
import { translate } from "@/lib/i18n/catalog";
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
  const token = params.token?.trim() ?? "";
  const invalid = params.error === "invalid-token" || token.length < 20;

  return (
    <AuthEntryShell locale={locale} width="lg">
      <h1 className="text-2xl font-black text-foreground">
        {translate(locale, "auth.verifyEmailTitle")}
      </h1>

      {invalid ? (
        <>
          <p className="mt-4 leading-7 text-foreground-muted">
            {translate(locale, "auth.verifyEmailInvalid")}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-primary hover:underline"
          >
            {translate(locale, "auth.backSignIn")}
          </Link>
        </>
      ) : (
        <>
          <p className="mt-4 leading-7 text-foreground-muted">
            {translate(locale, "auth.verifyEmailBody")}
          </p>
          <form action={verifyEmailAction} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:bg-primary-hover"
            >
              {translate(locale, "auth.verifyEmailCta")}
            </button>
          </form>
        </>
      )}
    </AuthEntryShell>
  );
}
