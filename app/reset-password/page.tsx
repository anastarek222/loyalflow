import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { AuthEntryShell } from "@/components/auth/auth-entry-shell";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password-policy";
import { translate } from "@/lib/i18n/catalog";
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
  const tokenValue = typeof params.token === "string" ? params.token : "";
  const errorValue = typeof params.error === "string" ? params.error : "";
  const invalidToken = !tokenValue || errorValue === "invalid-token";

  return (
    <AuthEntryShell locale={locale}>
      <div className="mb-7">
        <h1 className="text-2xl font-black text-foreground">
          {translate(locale, "auth.chooseNewPassword")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-foreground-subtle">
          {translate(locale, "auth.newPasswordRequirement")}
        </p>
      </div>

      {invalidToken ? (
        <div className="space-y-4">
          <div
            role="alert"
            className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger"
          >
            {translate(locale, "auth.resetLinkInvalid")}
          </div>
          <Link
            href="/forgot-password"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            {translate(locale, "auth.requestNewResetLink")}
          </Link>
        </div>
      ) : (
        <form action={resetPasswordAction} className="space-y-5">
          <input type="hidden" name="token" value={tokenValue} />

          {errorValue === "password-mismatch" ? (
            <div
              role="alert"
              className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger"
            >
              {translate(locale, "auth.passwordMismatch")}
            </div>
          ) : null}

          {errorValue === "password-invalid" ? (
            <div
              role="alert"
              className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger"
            >
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
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
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
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <button
            type="submit"
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary-hover"
          >
            {translate(locale, "auth.updatePassword")}
          </button>
        </form>
      )}
    </AuthEntryShell>
  );
}
