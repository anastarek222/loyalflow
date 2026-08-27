import Link from "next/link";
import { cookies } from "next/headers";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";

import { SuperAdminMfaSetupForm } from "./setup-form";

async function getAuthEntryLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export default async function SuperAdminMfaSetupPage() {
  const locale = await getAuthEntryLocale();
  const direction = getLocaleDirection(locale);

  return (
    <main lang={locale} dir={direction} className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 sm:px-6">
      <section className="w-full max-w-lg rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-h-11 items-center">
            <PlatformBrandIdentity
              fallback="letters"
              markClassName="hidden"
              wordmarkClassName="h-5 max-w-32"
              textClassName="font-black text-foreground"
            />
          </Link>
          <LanguageSwitcher locale={locale} />
        </div>
        <div className="mb-6">
          <p className="text-sm font-bold text-primary">
            {translate(locale, "auth.superAdminSecurity")}
          </p>
          <h1 className="mt-2 text-2xl font-black text-foreground">
            {translate(locale, "auth.setupMfaPageTitle")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-foreground-muted">
            {translate(locale, "auth.setupMfaPageBody")}
          </p>
        </div>

        <SuperAdminMfaSetupForm
          copy={{
            email: translate(locale, "auth.superAdminEmail"),
            password: translate(locale, "auth.password"),
            startError: translate(locale, "auth.mfaStartError"),
            preparing: translate(locale, "auth.mfaPreparing"),
            start: translate(locale, "auth.mfaStart"),
            addAuthenticator: translate(locale, "auth.mfaAddAuthenticator"),
            addAuthenticatorBody: translate(locale, "auth.mfaAddAuthenticatorBody"),
            openAuthenticator: translate(locale, "auth.mfaOpenAuthenticator"),
            recoveryTitle: translate(locale, "auth.mfaRecoveryTitle"),
            recoveryBody: translate(locale, "auth.mfaRecoveryBody"),
            sixDigitCode: translate(locale, "auth.mfaSixDigitCode"),
            confirmError: translate(locale, "auth.mfaConfirmError"),
            enabling: translate(locale, "auth.mfaEnabling"),
            enable: translate(locale, "auth.mfaEnable"),
          }}
        />

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {translate(locale, "auth.backSignIn")}
          </Link>
        </p>
      </section>
    </main>
  );
}
