import type { Metadata } from "next";
import Link from "next/link";

import { resendEmailVerificationAction } from "./actions";

export const metadata: Metadata = {
  title: "Resend verification email | Tanee",
  applicationName: "Tanee",
  robots: { index: false, follow: false },
};

export default async function ResendEmailVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Resend verification email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your account email. If it is eligible for verification, we will send a new link.
      </p>

      {sent === "1" ? (
        <p className="mt-6 rounded-md border p-3 text-sm">
          If that account needs verification, a new email has been requested.
        </p>
      ) : null}

      <form action={resendEmailVerificationAction} className="mt-6 space-y-4">
        <label className="block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="w-full rounded-md border px-3 py-2"
        />
        <button type="submit" className="w-full rounded-md border px-4 py-2 font-medium">
          Send verification link
        </button>
      </form>

      <Link href="/login" className="mt-6 text-sm underline">
        Back to sign in
      </Link>
    </main>
  );
}
