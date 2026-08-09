import Link from "next/link";

import { verifyEmailAction } from "@/app/verify-email/actions";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  const invalid = params.error === "invalid-token" || token.length < 20;

  return (
    <main className="min-h-screen bg-surface-subtle px-4 py-12">
      <div className="mx-auto max-w-lg rounded-[var(--lf-radius-card)] border border-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Verify your email</h1>

        {invalid ? (
          <>
            <p className="mt-4 text-foreground-muted">
              This verification link is invalid, expired, or has already been used.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block font-semibold text-primary hover:underline"
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 text-foreground-muted">
              Confirm this email address to finish verification.
            </p>
            <form action={verifyEmailAction} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover"
              >
                Verify email
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
