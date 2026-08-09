import Link from "next/link";

import { SuperAdminMfaSetupForm } from "./setup-form";

export default function SuperAdminMfaSetupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 sm:px-6">
      <section className="w-full max-w-lg rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold text-primary">Super Admin security</p>
          <h1 className="mt-2 text-2xl font-black text-foreground">Set up multi-factor authentication</h1>
          <p className="mt-3 text-sm leading-6 text-foreground-muted">
            MFA is required for Super Admin access. Verify your account, add LoyalFlow to an authenticator app, and save the one-time recovery codes.
          </p>
        </div>

        <SuperAdminMfaSetupForm />

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
