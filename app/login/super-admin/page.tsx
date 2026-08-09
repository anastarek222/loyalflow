import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { superAdminLoginAction } from "../actions";

type SuperAdminLoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function SuperAdminLoginPage({ searchParams }: SuperAdminLoginPageProps) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const params = await searchParams;
  const errorValue = params.error;
  const hasError = errorValue === "invalid" || (Array.isArray(errorValue) && errorValue.includes("invalid"));

  return (
    <main lang="en" dir="ltr" className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary text-lg font-black text-white">L</div>
          <h1 className="text-2xl font-black text-foreground">Super Admin sign in</h1>
          <p className="mt-2 text-sm text-foreground-subtle">Use your password and authenticator or recovery code.</p>
        </div>

        {hasError && <div className="mb-5 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">بيانات تسجيل الدخول أو رمز الأمان غير صحيحة.</div>}

        <form action={superAdminLoginAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground-muted">Email address</label>
            <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" placeholder="name@example.com" className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15" />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground-muted">Password</label>
            <input id="password" name="password" type="password" required minLength={10} autoComplete="current-password" dir="ltr" placeholder="Enter your password" className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15" />
          </div>

          <div>
            <label htmlFor="mfaCode" className="mb-2 block text-sm font-semibold text-foreground-muted">Authenticator or recovery code</label>
            <input id="mfaCode" name="mfaCode" type="text" required autoComplete="one-time-code" dir="ltr" placeholder="123456 or recovery code" maxLength={64} className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15" />
          </div>

          <button type="submit" className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover">Sign in securely</button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/login" className="font-semibold text-primary hover:underline">Back to regular sign in</Link>
          <Link href="/mfa/setup" className="text-foreground-subtle hover:text-primary hover:underline">Set up MFA</Link>
        </div>
      </section>
    </main>
  );
}
