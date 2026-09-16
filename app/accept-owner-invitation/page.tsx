import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AuthEntryShell } from "@/components/auth/auth-entry-shell";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password-policy";
import { translate } from "@/lib/i18n/catalog";
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
    title: { absolute: translate(locale, "ownerInvite.metaTitle") },
    description: translate(locale, "ownerInvite.metaDescription"),
    applicationName: "Tanee",
    robots: { index: false, follow: false },
  };
}

export default async function AcceptOwnerInvitationPage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const error = typeof params.error === "string" ? params.error : "";
  const missingToken = !token;
  const invalidToken = error === "invalid-token";
  const locale = await getInvitationLocale();

  return (
    <AuthEntryShell locale={locale}>
      <h1 className="text-2xl font-black text-foreground">
        {translate(locale, "ownerInvite.title")}
      </h1>
      <p className="mt-2 text-sm leading-6 text-foreground-muted">
        {translate(locale, missingToken ? "ownerInvite.missing" : "ownerInvite.body")}
      </p>

      {missingToken ? (
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            {translate(locale, "ownerInvite.backLogin")}
          </Link>
        </div>
      ) : invalidToken ? (
        <div className="mt-6 space-y-4">
          <div
            role="alert"
            className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger"
          >
            {translate(locale, "ownerInvite.invalid")}
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            {translate(locale, "ownerInvite.backLogin")}
          </Link>
        </div>
      ) : (
        <form action={acceptOwnerInvitationAction} className="mt-6 space-y-5">
          <input type="hidden" name="token" value={token} />

          {error === "password-mismatch" ? (
            <div
              role="alert"
              className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger"
            >
              {translate(locale, "ownerInvite.passwordMismatch")}
            </div>
          ) : null}

          {error === "password-invalid" ? (
            <div
              role="alert"
              className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger"
            >
              {translate(locale, "ownerInvite.passwordInvalid")}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
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
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
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
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <button
            type="submit"
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary-hover"
          >
            {translate(locale, "ownerInvite.activate")}
          </button>
        </form>
      )}
    </AuthEntryShell>
  );
}
