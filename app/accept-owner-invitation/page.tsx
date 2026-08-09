import Link from "next/link";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password-policy";

import { acceptOwnerInvitationAction } from "./actions";

type Props = {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
};

export default async function AcceptOwnerInvitationPage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const error = typeof params.error === "string" ? params.error : "";
  const invalidToken = !token || error === "invalid-token";

  return (
    <main className="min-h-screen bg-surface-subtle px-4 py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Accept owner invitation</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Choose your LoyalFlow password to activate your owner account.
        </p>

        {invalidToken ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
              This invitation link is invalid or has expired.
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form action={acceptOwnerInvitationAction} className="mt-6 space-y-5">
            <input type="hidden" name="token" value={token} />

            {error === "password-mismatch" ? (
              <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
                The passwords do not match.
              </div>
            ) : null}

            {error === "password-invalid" ? (
              <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
                Please choose a valid password.
              </div>
            ) : null}

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground-muted">
                Password
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
                Confirm password
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
              Activate owner account
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
