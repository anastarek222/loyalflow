import type { Metadata } from "next";
import Link from "next/link";

import { forgotPasswordAction } from "./actions";

export const metadata: Metadata = {
  title: { absolute: "Reset your password | Tanee" },
  applicationName: "Tanee",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    sent?: string | string[];
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const sent =
    params.sent === "1" ||
    (Array.isArray(params.sent) &&
      params.sent.includes("1"));

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
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-foreground-subtle">
            Enter your account email and we&apos;ll send password reset instructions.
          </p>
        </div>

        {sent ? (
          <div className="mb-5 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-3 text-sm text-foreground-muted">
            If an eligible account exists for that email, password reset instructions have been sent.
          </div>
        ) : null}

        <form
          action={forgotPasswordAction}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <button
            type="submit"
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            Send reset instructions
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
