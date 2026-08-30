import type { Metadata } from "next";
import Link from "next/link";

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

export default async function ResetPasswordPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const tokenValue =
    typeof params.token === "string"
      ? params.token
      : "";

  const errorValue =
    typeof params.error === "string"
      ? params.error
      : "";

  const invalidToken =
    !tokenValue ||
    errorValue === "invalid-token";

  return (
    <main
      lang="en"
      dir="ltr"
      className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 sm:px-6"
    >
      <section className="w-full max-w-md rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary text-lg font-black text-white">
            T
          </div>
          <h1 className="text-2xl font-black text-foreground">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm text-foreground-subtle">
            Your new password must contain at least 10 characters.
          </p>
        </div>

        {invalidToken ? (
          <div className="space-y-4">
            <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
              This reset link is invalid or has expired.
            </div>

            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form
            action={resetPasswordAction}
            className="space-y-5"
          >
            <input
              type="hidden"
              name="token"
              value={tokenValue}
            />

            {errorValue === "password-mismatch" ? (
              <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
                The passwords do not match.
              </div>
            ) : null}

            {errorValue === "password-invalid" ? (
              <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
                Please choose a valid password.
              </div>
            ) : null}

            <div>
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-semibold text-foreground-muted"
              >
                New password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-foreground-muted"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
              />
            </div>

            <button
              type="submit"
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover"
            >
              Update password
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
