import { auth } from "@/auth";
import { CustomerMessagesForm } from "@/components/customer-messages-form";
import { ProgramRulesForm } from "@/components/program-rules-form";
import { StandardCardSetup } from "@/components/standard-card-setup";
import { normalizeLanguage } from "@/lib/i18n";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsapp-templates";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  updateBusinessCardDesignAction,
  updateCustomerMessagesAction,
  updateProgramRulesAction,
} from "../settings/actions";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    program?: string;
    cardDesign?: string;
    messages?: string;
  }>;
};

export default async function LoyaltyProgramPage({
  params,
  searchParams,
}: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) redirect("/dashboard");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const language = normalizeLanguage(currentUser?.language);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const updateProgramRules = updateProgramRulesAction.bind(null, business.slug);
  const updateCardDesign = updateBusinessCardDesignAction.bind(
    null,
    business.slug,
  );
  const updateCustomerMessages = updateCustomerMessagesAction.bind(
    null,
    business.slug,
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/businesses/${business.slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("→ الرجوع إلى", "← Back to")} {business.name}
        </Link>
        <header className="mb-8 mt-4">
          <p className="text-sm font-black text-primary">
            {t("برنامج الولاء", "Loyalty Program")}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">
            {t("قواعد الكسب وبطاقة العميل", "Earning rules and customer card")}
          </h1>
          <p className="mt-2 text-foreground-subtle">
            {t(
              "أدر قواعد البرنامج وتصميم البطاقة ورسائل العملاء من مساحة عمل واحدة.",
              "Manage programme rules, card design, and customer messages in one workspace.",
            )}
          </p>
        </header>

        <section aria-labelledby="earning-rules-heading" className="mb-8">
          <h2 id="earning-rules-heading" className="mb-4 text-lg font-black text-foreground">
            {t("١. قواعد الكسب", "1. Earning Rules")}
          </h2>
          <ProgramRulesForm
            language={language}
            business={business}
            status={
              query.program === "saved" ||
              query.program === "invalid" ||
              query.program === "mode-blocked"
                ? query.program
                : undefined
            }
            action={updateProgramRules}
          />
        </section>

        <section
          aria-labelledby="customer-card-heading"
          className="rounded-[var(--lf-radius-card)] border border-border bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5">
            <h2 id="customer-card-heading" className="text-lg font-black text-foreground">
              {t("٢. بطاقة العميل", "2. Customer Card")}
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {t(
                "التصميم يخص النشاط ويُستخدم تلقائيًا لكل العملاء.",
                "This business-level design is reused automatically for every customer.",
              )}
            </p>
            {query.cardDesign === "saved" ? <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-success-subtle p-3 text-sm font-bold text-success">{t("تم حفظ تصميم البطاقة.", "Card design saved.")}</p> : null}
            {query.cardDesign === "invalid" ? <p role="alert" className="mt-3 rounded-xl bg-danger-subtle p-3 text-sm font-bold text-danger">{t("راجع إعدادات التصميم.", "Check the card design settings.")}</p> : null}
            {query.cardDesign === "forbidden" ? <p role="alert" className="mt-3 rounded-xl bg-danger-subtle p-3 text-sm font-bold text-danger">{t("التصميم المخصص متاح لمدير النظام فقط.", "Custom design is restricted to Super Admin.")}</p> : null}
            {query.cardDesign === "readonly" ? <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-primary/5 p-3 text-sm font-bold text-primary">{t("التصميم المخصص محفوظ وتتم إدارته بواسطة مدير النظام.", "The Custom Card is preserved and managed by Super Admin.")}</p> : null}
          </div>
          <form action={updateCardDesign}>
            {session.user.role === "SUPER_ADMIN" || business.cardDesignMode === "STANDARD" ? (
              <fieldset className="mb-5 rounded-2xl border border-border bg-surface-subtle p-5">
                <legend className="px-1 font-black">{t("شعار النشاط", "Business logo")}</legend>
                <p className="mb-4 text-sm text-foreground-muted">
                  {t(
                    "هذا هو المصدر الوحيد لشعار النشاط ويُستخدم تلقائيًا على البطاقة والأسطح العامة.",
                    "This is the single business-logo source used by the card and public customer surfaces.",
                  )}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-foreground">
                    {t("رفع شعار", "Upload logo")}
                    <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm" />
                  </label>
                  <label className="text-sm font-bold text-foreground">
                    {t("أو رابط الشعار", "Or logo URL")}
                    <input name="logoUrl" type="url" defaultValue={business.logoUrl?.startsWith("http") ? business.logoUrl : ""} maxLength={500} placeholder="https://example.com/logo.png" className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm" />
                  </label>
                </div>
                <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-foreground-muted">
                  <input name="removeLogo" type="checkbox" className="size-4" />
                  {t("إزالة الشعار الحالي", "Remove current logo")}
                </label>
              </fieldset>
            ) : null}
            <StandardCardSetup
              allowCustom={session.user.role === "SUPER_ADMIN"}
              language={language}
              initial={{
                businessName: business.name,
                logoUrl: business.logoUrl ?? "",
                primaryColor: business.primaryColor,
                themePreset: business.themePreset,
                artworkEnabled: business.standardCardArtworkEnabled,
                artworkCategory: business.standardCardArtworkCategory,
                loyaltyMode: business.loyaltyMode,
                unitName: business.unitName,
                currency: business.currency ?? "EGP",
                businessPhone: business.contactPhone ?? "",
                businessWebsite: business.website ?? "",
                businessLocation: [business.city, business.country].filter(Boolean).join(", "),
                rewardName: business.rewardName,
                rewardThreshold: business.rewardThreshold,
                designMode: business.cardDesignMode,
                customDesignEnabled: business.customCardArtworkEnabled,
                customFrontArtworkUrl: business.customCardFrontArtworkUrl ?? "",
                customBackArtworkUrl: business.customCardBackArtworkUrl ?? "",
              }}
            />
            {session.user.role === "SUPER_ADMIN" || business.cardDesignMode === "STANDARD" ? (
              <button type="submit" className="mt-5 rounded-[var(--lf-radius-input)] bg-primary px-6 py-3 font-black text-[var(--lf-primary-foreground)]">
                {t("حفظ تصميم البطاقة", "Save card design")}
              </button>
            ) : null}
          </form>
        </section>

        <section aria-labelledby="customer-messages-heading" className="mt-8">
          <h2
            id="customer-messages-heading"
            className="mb-4 text-lg font-black text-foreground"
          >
            {t("٣. رسائل العملاء", "3. Customer Messages")}
          </h2>
          <CustomerMessagesForm
            language={language}
            messages={{
              whatsappWelcomeMessage:
                business.whatsappWelcomeMessage ??
                DEFAULT_WHATSAPP_TEMPLATES.welcome,
              whatsappBalanceMessage:
                business.whatsappBalanceMessage ??
                DEFAULT_WHATSAPP_TEMPLATES.balance,
              whatsappRewardMessage:
                business.whatsappRewardMessage ??
                DEFAULT_WHATSAPP_TEMPLATES.reward,
            }}
            status={
              query.messages === "saved" || query.messages === "invalid"
                ? query.messages
                : undefined
            }
            action={updateCustomerMessages}
          />
        </section>
      </div>
    </main>
  );
}
