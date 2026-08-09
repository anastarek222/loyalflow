import { auth } from "@/auth";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { OwnerOnboardingWizard } from "@/components/owner-onboarding-wizard";
import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { launchOwnerOnboardingAction, saveOwnerOnboardingAction } from "./actions";

export const metadata: Metadata = {
  title: "Owner onboarding | LoyalFlow",
  description: "Complete the private LoyalFlow owner setup flow.",
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

  const locale = resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const direction = getLocaleDirection(locale);

  return (
    <main
      lang={locale}
      dir={direction}
      className="min-h-screen bg-surface-subtle px-4 py-8"
    >
      <div className="mx-auto mb-6 flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-foreground-subtle">
            {translate(locale, "onboarding.eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-black text-foreground">
            {translate(locale, "onboarding.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {translate(locale, "onboarding.description")}
          </p>
          <p className="mt-2 text-xs leading-5 text-foreground-subtle">
            {translate(locale, "onboarding.privateNote")}
          </p>
        </div>
        <LanguageSwitcher locale={locale} />
      </div>

      <OwnerOnboardingWizard
        locale={locale}
        draft={(user.onboardingData as Record<string, unknown> | null) ?? {}}
        saveAction={saveOwnerOnboardingAction}
        launchAction={launchOwnerOnboardingAction}
      />
    </main>
  );
}
