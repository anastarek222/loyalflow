import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPasswordChangeCopy } from "@/lib/auth/password-change-copy";
import { normalizeLanguage } from "@/lib/i18n";

import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    reset?: string | string[];
    password?: string | string[];
    verification?: string | string[];
    language?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const params = await searchParams;
  const errorValue = params.error;
  const resetValue = params.reset;
  const passwordValue = params.password;
  const verificationValue = params.verification;
  const language = normalizeLanguage(
    typeof params.language === "string" ? params.language : undefined,
  );

  const resetSucceeded = resetValue === "success" || (Array.isArray(resetValue) && resetValue.includes("success"));
  const passwordChanged = passwordValue === "changed" || (Array.isArray(passwordValue) && passwordValue.includes("changed"));
  const verificationSucceeded = verificationValue === "success" || (Array.isArray(verificationValue) && verificationValue.includes("success"));
  const hasError = errorValue === "invalid" || (Array.isArray(errorValue) && errorValue.includes("invalid"));

  return (
    <main lang="en" dir="ltr" className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary text-lg font-black text-white">L</div>
          <h1 className="text-2xl font-black text-foreground">LoyalFlow</h1>
          <p className="mt-2 text-sm text-foreground-subtle">Sign in to your workspace</p>
        </div>

        {resetSucceeded && <div className="mb-5 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-3 text-sm font-medium text-foreground-muted">Your password has been updated. Sign in with your new password.</div>}
        {passwordChanged && <div className="mb-5 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-3 text-sm font-medium text-foreground-muted">{getPasswordChangeCopy(language).success}</div>}
        {verificationSucceeded && <div className="mb-5 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-3 text-sm font-medium text-foreground-muted">Your email has been verified. You can sign in now.</div>}
        {hasError && <div className="mb-5 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">بيانات تسجيل الدخول غير صحيحة.</div>}

        <form action={loginAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground-muted">Email address</label>
            <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" placeholder="name@example.com" className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15" />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground-muted">Password</label>
            <input id="password" name="password" type="password" required minLength={10} autoComplete="current-password" dir="ltr" placeholder="Enter your password" className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15" />
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <Link href="/forgot-password" className="font-semibold text-primary hover:underline">Forgot password?</Link>
            <Link href="/login/super-admin" className="text-foreground-subtle hover:text-primary hover:underline">Super Admin sign-in</Link>
          </div>

          <button type="submit" className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover">Sign in</button>
        </form>

        <p className="mt-6 text-center text-xs text-foreground-subtle">Secure LoyalFlow workspace</p>
      </section>
    </main>
  );
}
