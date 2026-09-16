import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { getPasswordChangeCopy } from "@/lib/auth/password-change-copy";
import { normalizeLanguage } from "@/lib/i18n";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";

import { LoginForm } from "./login-form";

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

function includesValue(value: string | string[] | undefined, expected: string) {
  return (
    value === expected || (Array.isArray(value) && value.includes(expected))
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const locale = resolveRequestLocale(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value,
  );
  const direction = getLocaleDirection(locale);
  const language = normalizeLanguage(
    typeof params.language === "string" ? params.language : undefined,
  );
  const BackArrow = locale === "ar" ? ArrowRight : ArrowLeft;
  const notices = [
    includesValue(params.reset, "success")
      ? translate(locale, "auth.passwordResetSuccess")
      : null,
    includesValue(params.password, "changed")
      ? getPasswordChangeCopy(language).success
      : null,
    includesValue(params.verification, "success")
      ? translate(locale, "auth.verificationSuccess")
      : null,
    includesValue(params.mfa, "enabled")
      ? translate(locale, "auth.mfaEnabledSuccess")
      : null,
  ].filter(Boolean) as string[];

  return (
    <main
      lang={locale}
      dir={direction}
      className="relative min-h-screen overflow-hidden bg-[var(--lf-marketing-canvas)] text-foreground"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgb(255_102_82/0.12),transparent_32%),radial-gradient(circle_at_90%_85%,rgb(168_71_36/0.08),transparent_28%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
        <aside className="hidden flex-col justify-between p-10 lg:flex xl:p-14">
          <Link
            href="/"
            aria-label="Tanee"
            className="inline-flex min-h-11 w-fit items-center rounded-[var(--lf-radius-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
          >
            <PlatformBrandIdentity
              locale={locale}
              showMark={false}
              themeAdaptiveWordmark
              wordmarkClassName="h-7 w-auto max-w-36"
              wordmarkSize="marketing"
              textClassName="text-xl font-black text-foreground"
            />
          </Link>

          <div className="max-w-xl py-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-surface-raised px-3 py-1.5 text-xs font-black text-primary shadow-sm">
              <ShieldCheck size={15} aria-hidden="true" />
              {translate(locale, "auth.protectedAccess")}
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-[-0.035em] xl:text-5xl">
              {translate(locale, "auth.workspaceReadyTitle")}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-foreground-muted">
              {translate(locale, "auth.workspaceReadyBody")}
            </p>
            <ul className="mt-8 grid gap-4 text-sm font-semibold text-foreground-muted">
              {(
                [
                  "auth.benefitCustomers",
                  "auth.benefitRewards",
                  "auth.benefitRoles",
                ] as const
              ).map((key) => (
                <li key={key} className="flex items-center gap-3">
                  <CheckCircle2
                    size={20}
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {translate(locale, key)}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs font-semibold text-foreground-subtle">
            {translate(locale, "auth.secureWorkspace")}
          </p>
        </aside>

        <section className="flex min-h-screen flex-col bg-surface-raised px-4 py-5 sm:px-8 lg:px-12 lg:py-8 xl:px-16">
          <header className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-foreground-muted hover:text-foreground"
            >
              <BackArrow size={17} aria-hidden="true" />
              {translate(locale, "auth.backHome")}
            </Link>
            <LanguageSwitcher locale={locale} alternateOnly />
          </header>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <div className="mb-8 lg:hidden">
              <Link
                href="/"
                aria-label="Tanee"
                className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
              >
                <PlatformBrandIdentity
                  locale={locale}
                  showMark={false}
                  themeAdaptiveWordmark
                  wordmarkClassName="h-7 w-auto max-w-36"
                  wordmarkSize="marketing"
                  textClassName="text-lg font-black text-foreground"
                />
              </Link>
            </div>

            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              {translate(locale, "auth.welcomeBack")}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              {translate(locale, "auth.signInWorkspace")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-foreground-muted">
              {translate(locale, "auth.signInBody")}
            </p>

            {notices.map((notice) => (
              <p
                key={notice}
                role="status"
                className="mt-5 rounded-2xl border border-success/20 bg-success-subtle px-4 py-3 text-sm font-semibold text-success"
              >
                {notice}
              </p>
            ))}

            <div className="mt-8 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-[var(--lf-shadow-overlay)] sm:p-7">
              <LoginForm
                locale={locale}
                initialError={includesValue(params.error, "invalid")}
                copy={{
                  email: translate(locale, "auth.email"),
                  password: translate(locale, "auth.password"),
                  emailPlaceholder: translate(locale, "auth.emailPlaceholder"),
                  passwordPlaceholder: translate(
                    locale,
                    "auth.passwordPlaceholder",
                  ),
                  forgotPassword: translate(locale, "auth.forgotPassword"),
                  signIn: translate(locale, "auth.signIn"),
                  signingIn: translate(locale, "auth.signingIn"),
                  invalid: translate(locale, "auth.invalid"),
                  serviceUnavailable: translate(
                    locale,
                    "auth.serviceUnavailable",
                  ),
                  mfaTitle: translate(locale, "auth.mfaTitle"),
                  mfaBody: translate(locale, "auth.mfaBody"),
                  mfaLabel: translate(locale, "auth.mfaLabel"),
                  mfaPlaceholder: translate(locale, "auth.mfaPlaceholder"),
                  verify: translate(locale, "auth.verify"),
                  verifying: translate(locale, "auth.verifying"),
                  back: translate(locale, "auth.back"),
                  setupTitle: translate(locale, "auth.mfaSetupTitle"),
                  setupBody: translate(locale, "auth.mfaSetupBody"),
                  setupCta: translate(locale, "auth.mfaSetupCta"),
                  resendVerification: translate(
                    locale,
                    "auth.resendVerification",
                  ),
                  verificationRequiredTitle: translate(
                    locale,
                    "auth.verificationRequiredTitle",
                  ),
                  verificationRequiredBody: translate(
                    locale,
                    "auth.verificationRequiredBody",
                  ),
                  verificationRequiredCta: translate(
                    locale,
                    "auth.verificationRequiredCta",
                  ),
                }}
              />
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-foreground-subtle">
              {translate(locale, "auth.noRoleSelection")}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
