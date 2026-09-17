import { auth } from "@/auth";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { OwnerOnboardingWizardV2 } from "@/components/owner-onboarding-wizard-v2";
import { OwnerWhatsAppOnboarding } from "@/components/owner-whatsapp-onboarding";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";
import prisma from "@/lib/prisma";
import { getWhatsAppEmbeddedSignupReadiness } from "@/lib/server/integrations/whatsapp-embedded-signup";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  launchOwnerOnboardingAction,
  saveOwnerOnboardingAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Owner onboarding | Tanee",
  description: "Complete the private Tanee owner setup flow.",
  robots: { index: false, follow: false },
};

export default async function OwnerOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, cookieStore] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        onboardingStatus: true,
        businessId: true,
        onboardingData: true,
      },
    }),
    cookies(),
  ]);

  if (
    !user ||
    user.role !== "OWNER" ||
    user.onboardingStatus !== "PENDING" ||
    user.businessId
  ) {
    redirect("/dashboard");
  }

  const locale = resolveRequestLocale(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value,
  );
  const direction = getLocaleDirection(locale);
  const embeddedSignupReadiness = getWhatsAppEmbeddedSignupReadiness();
  const embeddedSignupAppId =
    process.env.NEXT_PUBLIC_WHATSAPP_META_APP_ID?.trim() ?? "";
  const embeddedSignupConfigId =
    process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID?.trim() ?? "";
  const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() ?? "";

  return (
    <main
      lang={locale}
      dir={direction}
      className="relative min-h-screen overflow-hidden bg-[var(--lf-marketing-canvas)] px-4 pb-12 text-foreground sm:px-6 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgb(255_102_82/0.12),transparent_28%),radial-gradient(circle_at_95%_35%,rgb(168_71_36/0.08),transparent_25%)]" />
      <div className="relative mx-auto w-full max-w-6xl">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-border/80">
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
              textClassName="text-xl font-black text-foreground"
            />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-bold text-foreground-subtle sm:inline-flex">
              <ShieldCheck
                size={16}
                className="text-primary"
                aria-hidden="true"
              />
              {translate(locale, "onboarding.privateNote")}
            </span>
            <LanguageSwitcher locale={locale} alternateOnly />
          </div>
        </header>

        <section className="pb-8 pt-10 sm:pt-12">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            {translate(locale, "onboarding.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {translate(locale, "onboarding.title")}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground-muted sm:text-base">
            {translate(locale, "onboarding.description")}
          </p>
        </section>

        <OwnerOnboardingWizardV2
          locale={locale}
          draft={(user.onboardingData as Record<string, unknown> | null) ?? {}}
          saveAction={saveOwnerOnboardingAction}
          launchAction={launchOwnerOnboardingAction}
        />
        <OwnerWhatsAppOnboarding
          locale={locale}
          launchAction={launchOwnerOnboardingAction}
          appId={embeddedSignupAppId}
          configId={embeddedSignupConfigId}
          graphApiVersion={graphApiVersion}
          embeddedSignupReady={embeddedSignupReadiness.ready}
        />
      </div>
    </main>
  );
}
