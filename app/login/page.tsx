import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgb(224_231_255/0.8),transparent_32%),radial-gradient(circle_at_90%_85%,rgb(219_234_254/0.65),transparent_28%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
        <aside className="hidden flex-col justify-between p-10 lg:flex xl:p-14">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-3 text-xl font-black tracking-tight"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-[0_10px_24px_rgb(79_70_229/0.24)]">
              <Sparkles size={19} aria-hidden="true" />
            </span>
            {translate(locale, "common.brand")}
          </Link>

          <div className="max-w-xl py-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-3 py-1.5 text-xs font-black text-primary shadow-sm backdrop-blur">
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

        <section className="flex min-h-screen flex-col bg-white/78 px-4 py-5 backdrop-blur-sm sm:px-8 lg:bg-white/72 lg:px-12 lg:py-8 xl:px-16">
          <header className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-foreground-muted hover:text-foreground"
            >
              <BackArrow size={17} aria-hidden="true" />
              {translate(locale, "auth.backHome")}
            </Link>
            <LanguageSwitcher locale={locale} />
          </header>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <div className="mb-8 lg:hidden">
              <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_rgb(79_70_229/0.24)]">
                <Sparkles size={21} aria-hidden="true" />
              </div>
              <p className="font-black">{translate(locale, "common.brand")}</p>
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

            <div className="mt-8 rounded-3xl border border-border/80 bg-white p-5 shadow-[0_24px_60px_rgb(15_23_42/0.1)] sm:p-7">
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
