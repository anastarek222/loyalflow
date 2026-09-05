import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password-policy";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";

import { resetPasswordAction } from "./actions";

export const metadata: Metadata = {
  title: { absolute: "Choose a new password | Tanee" },
  applicationName: "Tanee",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
};

async function getAuthEntryLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const [params, locale] = await Promise.all([
    searchParams,
    getAuthEntryLocale(),
  ]);
  const direction = getLocaleDirection(locale);
  const tokenValue = typeof params.token === "string" ? params.token : "";
  const errorValue = typeof params.error === "string" ? params.error : "";
  const invalidToken = !tokenValue || errorValue === "invalid-token";

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
            {translate(locale, "auth.chooseNewPassword")}
          </h1>
          <p className="mt-2 text-sm text-foreground-subtle">
            {translate(locale, "auth.newPasswordRequirement")}
          </p>
        </div>

        {invalidToken ? (
          <div className="space-y-4">
            <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
              {translate(locale, "auth.resetLinkInvalid")}
            </div>
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white"
            >
              {translate(locale, "auth.requestNewResetLink")}
            </Link>
          </div>
        ) : (
          <form action={resetPasswordAction} className="space-y-5">
            <input type="hidden" name="token" value={tokenValue} />

            {errorValue === "password-mismatch" ? (
              <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
                {translate(locale, "auth.passwordMismatch")}
              </div>
            ) : null}

            {errorValue === "password-invalid" ? (
              <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
                {translate(locale, "auth.passwordInvalid")}
              </div>
            ) : null}

            <div>
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-semibold text-foreground-muted"
              >
                {translate(locale, "auth.newPassword")}
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                autoComplete="new-password"
                className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-foreground-muted"
              >
                {translate(locale, "auth.confirmNewPassword")}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                autoComplete="new-password"
                className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
              />
            </div>

            <button
              type="submit"
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover"
            >
              {translate(locale, "auth.updatePassword")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
