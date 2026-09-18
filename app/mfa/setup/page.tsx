import Link from "next/link";
import { cookies } from "next/headers";

import { AuthEntryShell } from "@/components/auth/auth-entry-shell";
import { translate } from "@/lib/i18n/catalog";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";

import { SuperAdminMfaSetupForm } from "./setup-form";

async function getAuthEntryLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export default async function SuperAdminMfaSetupPage() {
  const locale = await getAuthEntryLocale();

  return (
    <AuthEntryShell locale={locale} width="lg">
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
    </AuthEntryShell>
  );
}
