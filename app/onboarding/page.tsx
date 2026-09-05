import { auth } from "@/auth";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { OwnerOnboardingWizard } from "@/components/owner-onboarding-wizard";
import { OwnerWhatsAppOnboarding } from "@/components/owner-whatsapp-onboarding";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";
import prisma from "@/lib/prisma";
import { ShieldCheck, Sparkles } from "lucide-react";
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

  return (
    <main
      lang={locale}
      dir={direction}
      className="relative min-h-screen overflow-hidden bg-[var(--lf-marketing-canvas)] px-4 pb-12 sm:px-6 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgb(224_231_255/0.72),transparent_28%),radial-gradient(circle_at_95%_35%,rgb(219_234_254/0.6),transparent_25%)]" />
      <div className="relative mx-auto w-full max-w-6xl">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-white/80">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2.5 rounded-xl font-black tracking-tight text-foreground"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_20px_rgb(79_70_229/0.22)]">
              <Sparkles size={18} aria-hidden="true" />
            </span>
            <span className="text-lg sm:text-xl">
              {translate(locale, "common.brand")}
            </span>
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
            <LanguageSwitcher locale={locale} />
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

        <OwnerOnboardingWizard
          locale={locale}
          draft={(user.onboardingData as Record<string, unknown> | null) ?? {}}
          saveAction={saveOwnerOnboardingAction}
          launchAction={launchOwnerOnboardingAction}
        />
        <OwnerWhatsAppOnboarding
          locale={locale}
          launchAction={launchOwnerOnboardingAction}
        />
      </div>
    </main>
  );
}
