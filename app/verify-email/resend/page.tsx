import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { AuthEntryShell } from "@/components/auth/auth-entry-shell";
import { translate } from "@/lib/i18n/catalog";
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

  return (
    <AuthEntryShell locale={locale}>
      <h1 className="text-2xl font-black text-foreground">
        {translate(locale, "auth.resendVerificationTitle")}
      </h1>
      <p className="mt-2 text-sm leading-6 text-foreground-muted">
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
          className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 text-foreground outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
        />
        <button
          type="submit"
          className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary-hover"
        >
          {translate(locale, "auth.sendVerificationLink")}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
      >
        {translate(locale, "auth.backSignIn")}
      </Link>
    </AuthEntryShell>
  );
}
