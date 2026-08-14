import { BookOpen, CreditCard, MessageCircle } from "lucide-react";
import { auth } from "@/auth";
import { CustomerMessagesForm } from "@/components/customer-messages-form";
import { ProgramRulesForm } from "@/components/program-rules-form";
import { StandardCardSetup } from "@/components/standard-card-setup";
import { CustomCardArtworkManager } from "@/components/custom-card-artwork-manager";
import {
  customCardStorageConfigured,
  isManagedCustomCardArtworkUrl,
  listCustomCardArtworkVersions,
} from "@/lib/cards/custom-card-storage";
import { normalizeLanguage } from "@/lib/i18n";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsapp-templates";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  updateBusinessCardDesignAction,
  publishCustomCardArtworkAction,
  uploadCustomCardArtworkAction,
  updateCustomerMessagesAction,
  updateProgramRulesAction,
} from "../settings/actions";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    program?: string;
    cardDesign?: string;
    customVersion?: string;
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
  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      customers: {
        where: { balance: { not: 0 } },
        select: { id: true },
        take: 1,
      },
      _count: {
        select: {
          transactions: true,
          rewards: true,
          rewardUnlocks: true,
          redemptions: true,
        },
      },
    },
  });
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) redirect("/dashboard");

  const hasProgrammeHistory =
    business.customers.length > 0 ||
    business._count.transactions > 0 ||
    business._count.rewards > 0 ||
    business._count.rewardUnlocks > 0 ||
    business._count.redemptions > 0;

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
  const uploadCustomArtwork = uploadCustomCardArtworkAction.bind(
    null,
    business.slug,
  );
  const publishCustomArtwork = publishCustomCardArtworkAction.bind(
    null,
    business.slug,
  );
  const customArtworkVersions =
    session.user.role === "SUPER_ADMIN"
      ? await listCustomCardArtworkVersions(business.id)
      : [];
  const updateCustomerMessages = updateCustomerMessagesAction.bind(
    null,
    business.slug,
  );

  return (
    <main
      className="min-h-screen bg-surface-subtle px-4 py-6 sm:px-6 sm:py-8"
      style={{
        backgroundImage:
          "radial-gradient(circle at top right, var(--lf-primary-soft), transparent 36rem)",
      }}
      data-program-workspace
    >
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/businesses/${business.slug}`}
          className="inline-flex min-h-11 items-center rounded-full border border-primary/15 bg-white/90 px-4 py-2 text-sm font-bold text-primary shadow-sm transition hover:border-primary/30 hover:bg-primary-subtle"
        >
          {t("→ الرجوع إلى", "← Back to")} {business.name}
        </Link>

        <header className="relative mb-6 mt-4 overflow-hidden rounded-[var(--lf-radius-card)] border border-primary/15 bg-gradient-to-br from-primary via-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-primary/15 sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -end-16 -top-24 size-64 rounded-full border-[36px] border-white/5"
          />
          <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <span className="flex size-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <BookOpen className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-white/60">
                {t("برنامج الولاء", "Loyalty Program")}
              </p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                {t(
                  "قواعد الكسب وبطاقة العميل",
                  "Earning rules and customer card",
                )}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                {t(
                  "أدر قواعد البرنامج وتصميم البطاقة ورسائل العملاء من مساحة عمل واحدة.",
                  "Manage programme rules, card design, and customer messages in one workspace.",
                )}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ProgramSummary
                label={t("النظام", "Mode")}
                value={
                  business.loyaltyMode === "VISITS"
                    ? t("زيارات", "Visits")
                    : business.loyaltyMode === "POINTS"
                      ? t("نقاط", "Points")
                      : t("مبيعات", "Sales")
                }
              />
              <ProgramSummary
                label={t("قيمة الكسب", "Earn")}
                value={`${business.earnAmount} ${business.unitName}`}
              />
              <ProgramSummary
                label={t("هدف المكافأة", "Target")}
                value={`${business.rewardThreshold} ${business.unitName}`}
              />
            </div>
          </div>
        </header>

        <nav
          aria-label={t("أقسام برنامج الولاء", "Loyalty programme sections")}
          className="mb-8 grid gap-2 rounded-[var(--lf-radius-card)] border border-border bg-white p-2 shadow-sm sm:grid-cols-3"
          data-program-section-navigation
        >
          <ProgramSectionLink
            href="#earning-rules"
            icon={<BookOpen className="size-4" aria-hidden="true" />}
            label={t("قواعد الكسب", "Earning rules")}
          />
          <ProgramSectionLink
            href="#customer-card"
            icon={<CreditCard className="size-4" aria-hidden="true" />}
            label={t("بطاقة العميل", "Customer card")}
          />
          <ProgramSectionLink
            href="#customer-messages"
            icon={<MessageCircle className="size-4" aria-hidden="true" />}
            label={t("رسائل العملاء", "Customer messages")}
          />
        </nav>

        <section
          id="earning-rules"
          aria-labelledby="earning-rules-heading"
          className="mb-8 scroll-mt-24"
        >
          <SectionHeading
            icon={<BookOpen className="size-5" aria-hidden="true" />}
            eyebrow={t("الخطوة الأولى", "Step one")}
            title={t("قواعد الكسب", "Earning Rules")}
            description={t(
              "حدد كيف يكسب العميل، وما هو الهدف، والمكافأة الافتراضية المتوافقة.",
              "Define how customers earn, the target, and the compatible fallback reward.",
            )}
            id="earning-rules-heading"
          />
          <ProgramRulesForm
            language={language}
            business={business}
            hasProgrammeHistory={hasProgrammeHistory}
            status={
              query.program === "saved" ||
              query.program === "invalid" ||
              query.program === "mode-blocked" ||
              query.program === "economic-confirmation-required"
                ? query.program
                : undefined
            }
            action={updateProgramRules}
          />
        </section>

        <section
          id="customer-card"
          aria-labelledby="customer-card-heading"
          className="scroll-mt-24 rounded-[var(--lf-radius-card)] border border-border bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="mb-6 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
              <CreditCard className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                {t("الخطوة الثانية", "Step two")}
              </p>
              <h2
                id="customer-card-heading"
                className="mt-1 text-xl font-black text-foreground"
              >
                {t("بطاقة العميل", "Customer Card")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-foreground-muted">
                {t(
                  "التصميم يخص النشاط ويُستخدم تلقائيًا لكل العملاء.",
                  "This business-level design is reused automatically for every customer.",
                )}
              </p>
            </div>
          </div>
          <div>
            {query.cardDesign === "saved" ? (
              <p
                role="status"
                aria-live="polite"
                className="mt-3 rounded-xl bg-success-subtle p-3 text-sm font-bold text-success"
              >
                {t("تم حفظ تصميم البطاقة.", "Card design saved.")}
              </p>
            ) : null}
            {query.cardDesign === "invalid" ? (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-danger-subtle p-3 text-sm font-bold text-danger"
              >
                {t("راجع إعدادات التصميم.", "Check the card design settings.")}
              </p>
            ) : null}
            {query.cardDesign === "forbidden" ? (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-danger-subtle p-3 text-sm font-bold text-danger"
              >
                {t(
                  "التصميم المخصص متاح لمدير النظام فقط.",
                  "Custom design is restricted to Super Admin.",
                )}
              </p>
            ) : null}
            {query.cardDesign === "readonly" ? (
              <p
                role="status"
                aria-live="polite"
                className="mt-3 rounded-xl bg-primary/5 p-3 text-sm font-bold text-primary"
              >
                {t(
                  "التصميم المخصص محفوظ وتتم إدارته بواسطة مدير النظام.",
                  "The Custom Card is preserved and managed by Super Admin.",
                )}
              </p>
            ) : null}
            {query.cardDesign === "subscription-restricted" ? (
              <p className="mb-5 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-semibold text-danger">
                {t(
                  "لا يمكن تعديل تصميم الكارت في حالة الاشتراك الحالية.",
                  "Card design cannot be changed in the current subscription state.",
                )}
              </p>
            ) : null}
          </div>
          {session.user.role === "SUPER_ADMIN" ? (
            <CustomCardArtworkManager
              slug={business.slug}
              selectedVersion={query.customVersion}
              versions={customArtworkVersions}
              storageConfigured={customCardStorageConfigured()}
              uploadAction={uploadCustomArtwork}
              publishAction={publishCustomArtwork}
            />
          ) : null}
          <form action={updateCardDesign}>
            {session.user.role === "SUPER_ADMIN" ||
            business.cardDesignMode === "STANDARD" ? (
              <fieldset className="mb-5 rounded-2xl border border-border bg-surface-subtle p-5">
                <legend className="px-1 font-black">
                  {t("شعار النشاط", "Business logo")}
                </legend>
                <p className="mb-4 text-sm text-foreground-muted">
                  {t(
                    "هذا هو المصدر الوحيد لشعار النشاط ويُستخدم تلقائيًا على البطاقة والأسطح العامة.",
                    "This is the single business-logo source used by the card and public customer surfaces.",
                  )}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-foreground">
                    {t("رفع شعار", "Upload logo")}
                    <input
                      name="logoFile"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
                    />
                  </label>
                  <label className="text-sm font-bold text-foreground">
                    {t("أو رابط الشعار", "Or logo URL")}
                    <input
                      name="logoUrl"
                      type="url"
                      defaultValue={
                        business.logoUrl?.startsWith("http")
                          ? business.logoUrl
                          : ""
                      }
                      maxLength={500}
                      placeholder="https://example.com/logo.png"
                      className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
                    />
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
                businessLocation: [business.city, business.country]
                  .filter(Boolean)
                  .join(", "),
                rewardName: business.rewardName,
                rewardThreshold: business.rewardThreshold,
                designMode: business.cardDesignMode,
                customDesignEnabled: business.customCardArtworkEnabled,
                customFrontArtworkUrl: business.customCardFrontArtworkUrl ?? "",
                customBackArtworkUrl: business.customCardBackArtworkUrl ?? "",
                customFrontArtworkPreviewUrl: isManagedCustomCardArtworkUrl(
                  business.customCardFrontArtworkUrl,
                  business.id,
                )
                  ? `/api/businesses/${encodeURIComponent(business.slug)}/custom-card-artwork/published/front`
                  : business.customCardFrontArtworkUrl ?? "",
                customBackArtworkPreviewUrl: isManagedCustomCardArtworkUrl(
                  business.customCardBackArtworkUrl,
                  business.id,
                )
                  ? `/api/businesses/${encodeURIComponent(business.slug)}/custom-card-artwork/published/back`
                  : business.customCardBackArtworkUrl ?? "",
              }}
            />
            {session.user.role === "SUPER_ADMIN" ||
            business.cardDesignMode === "STANDARD" ? (
              <button
                type="submit"
                className="mt-5 rounded-[var(--lf-radius-input)] bg-primary px-6 py-3 font-black text-[var(--lf-primary-foreground)]"
              >
                {t("حفظ تصميم البطاقة", "Save card design")}
              </button>
            ) : null}
          </form>
        </section>

        <section
          id="customer-messages"
          aria-labelledby="customer-messages-heading"
          className="mt-8 scroll-mt-24"
        >
          <SectionHeading
            icon={<MessageCircle className="size-5" aria-hidden="true" />}
            eyebrow={t("الخطوة الثالثة", "Step three")}
            title={t("رسائل العملاء", "Customer Messages")}
            description={t(
              "جهّز قوالب واتساب واضحة تُفتح للمراجعة اليدوية بعد الأحداث المهمة.",
              "Prepare clear WhatsApp templates for manual review after important customer events.",
            )}
            id="customer-messages-heading"
          />
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

function ProgramSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/60 sm:text-xs">
        {label}
      </p>
      <p
        dir="auto"
        className="mt-1 truncate text-sm font-black text-white sm:text-base"
      >
        {value}
      </p>
    </div>
  );
}

function ProgramSectionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--lf-radius-input)] px-4 text-sm font-bold text-foreground-muted transition hover:bg-primary-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {icon}
      {label}
    </a>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  description,
  id,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
          {eyebrow}
        </p>
        <h2 id={id} className="mt-1 text-xl font-black text-foreground">
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-foreground-muted">
          {description}
        </p>
      </div>
    </div>
  );
}
