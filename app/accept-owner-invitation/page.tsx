import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password-policy";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";

import { acceptOwnerInvitationAction } from "./actions";

type Props = {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
};

async function getInvitationLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getInvitationLocale();

  return {
    title: translate(locale, "ownerInvite.metaTitle"),
    description: translate(locale, "ownerInvite.metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AcceptOwnerInvitationPage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const error = typeof params.error === "string" ? params.error : "";
  const invalidToken = !token || error === "invalid-token";
  const locale = await getInvitationLocale();
  const direction = getLocaleDirection(locale);

  return (
    <main lang={locale} dir={direction} className="min-h-screen bg-surface-subtle px-4 py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher locale={locale} />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{translate(locale, "ownerInvite.title")}</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {translate(locale, "ownerInvite.body")}
        </p>

        {invalidToken ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
              {translate(locale, "ownerInvite.invalid")}
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white"
            >
              {translate(locale, "ownerInvite.backLogin")}
            </Link>
          </div>
        ) : (
          <form action={acceptOwnerInvitationAction} className="mt-6 space-y-5">
            <input type="hidden" name="token" value={token} />

            {error === "password-mismatch" ? (
              <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
                {translate(locale, "ownerInvite.passwordMismatch")}
              </div>
            ) : null}

            {error === "password-invalid" ? (
              <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
                {translate(locale, "ownerInvite.passwordInvalid")}
              </div>
            ) : null}

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground-muted">
                {translate(locale, "ownerInvite.password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                autoComplete="new-password"
                className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-foreground-muted">
                {translate(locale, "ownerInvite.confirmPassword")}
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
              {translate(locale, "ownerInvite.activate")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
