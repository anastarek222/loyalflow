import { auth } from "@/auth";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getPasswordChangeCopy } from "@/lib/auth/password-change-copy";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { normalizeLanguage } from "@/lib/i18n";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    reset?: string | string[];
    password?: string | string[];
    verification?: string | string[];
    mfa?: string | string[];
    language?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const locale = resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const direction = getLocaleDirection(locale);
  const errorValue = params.error;
  const resetValue = params.reset;
  const passwordValue = params.password;
  const verificationValue = params.verification;
  const mfaValue = params.mfa;
  const language = normalizeLanguage(
    typeof params.language === "string" ? params.language : undefined,
  );

  const resetSucceeded = resetValue === "success" || (Array.isArray(resetValue) && resetValue.includes("success"));
  const passwordChanged = passwordValue === "changed" || (Array.isArray(passwordValue) && passwordValue.includes("changed"));
  const verificationSucceeded = verificationValue === "success" || (Array.isArray(verificationValue) && verificationValue.includes("success"));
  const mfaEnabled = mfaValue === "enabled" || (Array.isArray(mfaValue) && mfaValue.includes("enabled"));
  const hasError = errorValue === "invalid" || (Array.isArray(errorValue) && errorValue.includes("invalid"));

  return (
    <main lang={locale} dir={direction} className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher locale={locale} />
        </div>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary text-lg font-black text-white">L</div>
          <h1 className="text-2xl font-black text-foreground">{translate(locale, "common.brand")}</h1>
          <p className="mt-2 text-sm text-foreground-subtle">{translate(locale, "auth.signInWorkspace")}</p>
        </div>

        {resetSucceeded && <div className="mb-5 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-3 text-sm font-medium text-foreground-muted">Your password has been updated. Sign in with your new password.</div>}
        {passwordChanged && <div className="mb-5 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-3 text-sm font-medium text-foreground-muted">{getPasswordChangeCopy(language).success}</div>}
        {verificationSucceeded && <div className="mb-5 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-3 text-sm font-medium text-foreground-muted">Your email has been verified. You can sign in now.</div>}
        {mfaEnabled && <div className="mb-5 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-3 text-sm font-medium text-foreground-muted">MFA is enabled. Super Admin sign-in now requires an authenticator or recovery code.</div>}
        {hasError && <div className="mb-5 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">بيانات تسجيل الدخول أو رمز الأمان غير صحيحة.</div>}

        <form action={loginAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground-muted">{translate(locale, "auth.email")}</label>
            <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" placeholder="name@example.com" className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15" />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground-muted">{translate(locale, "auth.password")}</label>
            <input id="password" name="password" type="password" required minLength={10} autoComplete="current-password" dir="ltr" placeholder="Enter your password" className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15" />
          </div>

          <div>
            <label htmlFor="mfaCode" className="mb-2 block text-sm font-semibold text-foreground-muted">Authenticator or recovery code <span className="font-normal text-foreground-subtle">(Super Admin)</span></label>
            <input id="mfaCode" name="mfaCode" type="text" autoComplete="one-time-code" dir="ltr" placeholder="123456 or recovery code" maxLength={64} className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link href="/mfa/setup" className="font-semibold text-primary hover:underline">Set up Super Admin MFA</Link>
            <Link href="/verify-email/resend" className="font-semibold text-primary hover:underline">Resend verification</Link>
            <Link href="/forgot-password" className="font-semibold text-primary hover:underline">{translate(locale, "auth.forgotPassword")}</Link>
          </div>

          <button type="submit" className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover">{translate(locale, "auth.signIn")}</button>
        </form>

        <p className="mt-6 text-center text-xs text-foreground-subtle">{translate(locale, "auth.secureWorkspace")}</p>
      </section>
    </main>
  );
}
