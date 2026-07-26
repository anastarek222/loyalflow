import { auth } from "@/auth";
import BusinessSettingsForm from "@/components/business-settings-form";
import CardBusinessDetailsForm from "@/components/card-business-details-form";
import { AdministrationNavigation } from "@/components/administration/administration-navigation";
import { getRequestBaseUrl } from "@/lib/app-url";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsapp-templates";
import { normalizeLanguage } from "@/lib/i18n";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import * as QRCode from "qrcode";

import {
  syncGoogleSheetAction,
  updateBusinessCardDetailsAction,
  updateBusinessSettingsAction,
  updateBusinessExportPermissionAction,
} from "./actions";

type BusinessSettingsPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    saved?: string;
    error?: string;
    sheetSync?: string;
    cardSaved?: string;
    cardError?: string;
  }>;
};

export default async function BusinessSettingsPage({
  params,
  searchParams,
}: BusinessSettingsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;
  const query = await searchParams;

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
  });

  if (!business) {
    notFound();
  }

  const canManage = canManageBusiness(session.user, business.id);

  if (!canManage) {
    redirect("/dashboard");
  }

  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { language: true } });
  const language = normalizeLanguage(currentUser?.language);
  const t = (ar: string, en: string) => language === "AR" ? ar : en;

  const updateSettings = updateBusinessSettingsAction.bind(null, business.slug);

  const syncGoogleSheet = syncGoogleSheetAction.bind(null, business.slug);

  const updateCardDetails = updateBusinessCardDetailsAction.bind(
    null,
    business.slug,
  );

  const joinUrl = `${await getRequestBaseUrl()}/join/${business.slug}`;
  const joinQrCode = await QRCode.toDataURL(joinUrl, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <AdministrationNavigation user={session.user} businessId={business.id} slug={business.slug} active="settings" language={language} />
        <Link
          href={`/businesses/${business.slug}`}
          className="text-sm font-medium text-primary hover:text-primary"
        >
          {t("→ الرجوع إلى", "← Back to")} {business.name}
        </Link>

        <header className="mb-8 mt-4">
          <h1 className="text-3xl font-bold text-foreground">{t("إعدادات النشاط", "Business settings")}</h1>

          <p className="mt-1 text-foreground-subtle">
            {t("تخصيص برنامج الولاء والكارت الرقمي.", "Configure the loyalty programme and digital card.")}
          </p>
        </header>

        {query.sheetSync === "success" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {t("تمت مزامنة Google Sheets بنجاح.", "Google Sheets synced successfully.")}
          </div>
        )}

        {query.sheetSync === "error" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {t("تعذرت مزامنة Google Sheets. حاول مرة أخرى.", "Google Sheets sync failed. Please try again.")}
          </div>
        )}

        <details className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-surface">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
            <span>
              <span className="block text-sm font-bold text-foreground">{t("QR لانضمام العملاء", "Customer join QR")}</span>
              <span className="mt-0.5 block text-xs text-foreground-subtle">{t("افتحه عند الطباعة أو مشاركة رابط التسجيل.", "Open it when printing or sharing the enrolment link.")}</span>
            </span>
            <span className="text-xs font-semibold text-primary">{t("عرض", "Show")}</span>
          </summary>
          <div className="flex flex-col gap-6 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-primary">
                {t("التسجيل الذاتي", "Self-enrolment")}
              </p>

              <h2 className="mt-1 text-xl font-black text-foreground">
                {t("QR لانضمام العملاء", "Customer join QR")}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-foreground-muted">
                {t("اطبع هذا الرمز أو شارك الرابط حتى يسجل العملاء بأنفسهم ويستلموا كارتهم الرقمي.", "Print this code or share the link so customers can enrol themselves and receive their digital card.")}
              </p>

              <a
                href={joinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block break-all text-sm font-bold text-primary underline underline-offset-4"
              >
                {joinUrl}
              </a>
            </div>

            {/* QR data URLs are generated on the server and cannot use next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={joinQrCode}
              alt={t(`QR للتسجيل الذاتي في ${business.name}`, `Self-enrolment QR for ${business.name}`)}
              className="h-48 w-48 rounded-[var(--lf-radius-card)] border border-border bg-white p-2"
            />
          </div>
        </details>

        <details className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
            <span>
              <span className="block text-sm font-bold text-foreground">
                {t("أدوات وإعدادات متقدمة", "Advanced tools & integrations")}
              </span>
              <span className="mt-0.5 block text-xs text-foreground-subtle">
                {t("المكافآت والقوالب والمزامنة متاحة هنا عند الحاجة.", "Rewards, playbooks and data sync stay available here when you need them.")}
              </span>
            </span>
            <span className="text-xs font-semibold text-primary">
              {t("إظهار", "Show")}
            </span>
          </summary>
          <div className="border-t border-border p-4 sm:p-5">
        <section className="mb-4 flex flex-col gap-4 rounded-[var(--lf-radius-card)] border border-warning/30 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-warning">{t("كتالوج المكافآت", "Reward catalogue")}</p>
            <h2 className="mt-1 text-xl font-black text-foreground">
              {t("مكافآت متعددة قابلة للتفعيل", "Multiple configurable rewards")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
              {t("أضف مكافآت إضافية وحدد ما يظهر للموظفين عند استبدال رصيد العميل.", "Add rewards and control what staff see when redeeming customer balance.")}
            </p>
          </div>

          <Link
            href={`/businesses/${business.slug}/rewards`}
            className="shrink-0 rounded-[var(--lf-radius-input)] bg-warning px-6 py-4 text-center font-black text-foreground transition hover:bg-warning-subtle"
          >
            {t("إدارة المكافآت", "Manage rewards")}
          </Link>
        </section>

        <section className="mb-4 flex flex-col gap-4 rounded-[var(--lf-radius-card)] border border-primary/30 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-primary">{t("انطلاقة أسرع", "Faster setup")}</p>
            <h2 className="mt-1 text-xl font-black text-foreground">
              {t("قوالب تشغيل النشاط", "Business playbooks")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
              {t("عاين إعدادات مناسبة لنشاطك ثم طبّقها صراحةً. القالب لا ينشئ عروضًا أو Promotions أو رسائل تلقائية.", "Preview suitable business settings and apply them explicitly. Playbooks do not create offers, promotions, or automated messages.")}
            </p>
          </div>

          <Link
            href={`/businesses/${business.slug}/playbooks`}
            className="shrink-0 rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 text-center font-black text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle"
          >
            {t("استعرض القوالب", "Browse playbooks")}
          </Link>
        </section>

        <section className="mb-0 flex flex-col gap-4 rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t("النسخ الاحتياطي على Google Sheets", "Google Sheets backup")}
            </h2>

            <p className="mt-1 text-sm text-foreground-subtle">
              {t("إرسال أحدث بيانات العملاء والأرصدة والمكافآت إلى ملف النشاط.", "Send the latest customers, balances, and rewards to the business sheet.")}
            </p>
          </div>

          <form action={syncGoogleSheet}>
            <button
              type="submit"
              className="w-full rounded-[var(--lf-radius-input)] bg-success px-6 py-4 font-semibold text-[var(--lf-inverse)] transition hover:bg-success-subtle sm:w-auto"
            >
              {t("مزامنة Google Sheets", "Sync Google Sheets")}
            </button>
          </form>
        </section>
          </div>
        </details>


        {query.cardSaved === "1" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {t("تم حفظ بيانات الكارت بنجاح.", "Card details saved successfully.")}
          </div>
        )}

        {query.cardError === "invalid" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {t("راجع رقم الهاتف والعنوان وشروط الكارت.", "Review the phone number, address, and card terms.")}
          </div>
        )}

        <details className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-surface">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
            <span>
              <span className="block text-sm font-bold text-foreground">{t("بيانات كارت العميل", "Customer card details")}</span>
              <span className="mt-0.5 block text-xs text-foreground-subtle">{t("الهاتف والعنوان وشروط الكارت عند الحاجة.", "Phone, address and card terms when needed.")}</span>
            </span>
            <span className="text-xs font-semibold text-primary">{t("تعديل", "Edit")}</span>
          </summary>
          <div className="border-t border-border p-4 sm:p-5">
        <CardBusinessDetailsForm
          contactPhone={business.contactPhone ?? "01033196610"}
          address={
            business.address ??
            (language === "AR"
              ? "١ شارع دكتور لاشين، المريوطية الرئيسي، فيصل، الجيزة"
              : "1 Dr. Lasheen Street, Mariouteya Main Road, Faisal, Giza")
          }
          cardTerms={
            business.cardTerms ??
            (language === "AR"
              ? [
                  "كل عملية مؤهلة تضيف {earn} {unit}.",
                  "عند الوصول إلى {threshold} {unit} يحصل العميل على {reward}.",
                  "لا يمكن استبدال الرصيد نقدًا.",
                ]
              : [
                  "Each eligible transaction adds {earn} {unit}.",
                  "At {threshold} {unit}, the customer earns {reward}.",
                  "Loyalty balance cannot be redeemed for cash.",
                ]).join("\n")
          }
          action={updateCardDetails}
        />
          </div>
        </details>

        {session.user.role === "SUPER_ADMIN" ? (
          <section className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-black text-primary">
                  {t("إعدادات مدير النظام", "System administrator settings")}
                </p>

                <h2 className="mt-1 text-xl font-black text-foreground">
                  {t("صلاحية تصدير البيانات", "Data export permission")}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
                  {t("عند التفعيل يستطيع مالك النشاط تصدير العملاء وتقارير الحركات. الموظفون لا يحصلون على صلاحية التصدير.", "When enabled, the owner can export customers and transaction reports. Staff do not receive export permission.")}
                </p>
              </div>

              <form
                action={updateBusinessExportPermissionAction.bind(
                  null,
                  business.slug,
                )}
                className="flex shrink-0 flex-col gap-4 rounded-[var(--lf-radius-card)] bg-surface-subtle p-4 sm:min-w-72"
              >
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span className="font-black text-foreground-muted">
                    {t("السماح للمالك بالتصدير", "Allow owner exports")}
                  </span>

                  <input
                    type="checkbox"
                    name="allowOwnerDataExport"
                    defaultChecked={business.allowOwnerDataExport}
                    className="h-5 w-5 accent-[var(--lf-primary)]"
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-black text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle"
                >
                  {t("حفظ صلاحية التصدير", "Save export permission")}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-foreground-subtle">{t("تصدير البيانات", "Data export")}</p>

            <p className="mt-2 font-black text-foreground">
              {business.allowOwnerDataExport
                ? t("مسموح بواسطة مدير النظام", "Allowed by system administrator")
                : t("غير مسموح بواسطة مدير النظام", "Not allowed by system administrator")}
            </p>
          </section>
        )}

        <BusinessSettingsForm
          language={language}
          business={{
            name: business.name,
            slug: business.slug,
            logoUrl: business.logoUrl,
            coverImageUrl: business.coverImageUrl,
            primaryColor: business.primaryColor,
            secondaryColor: business.secondaryColor,
            currency: business.currency,
            timezone: business.timezone,
        
            industry: business.industry, 
            website: business.website,
            email: business.email,
            country: business.country, 
            city: business.city,
            taxNumber: business.taxNumber,
            employeeCount: business.employeeCount,

            description: business.description,
            instagramUrl: business.instagramUrl,
            facebookUrl: business.facebookUrl,
            tiktokUrl: business.tiktokUrl,

            themePreset: business.themePreset,
            cardStyle: business.cardStyle,
            fontFamily: business.fontFamily,
            qrStyle: business.qrStyle,
            qrPosition: business.qrPosition,

            loyaltyProgramName: business.loyaltyProgramName,
            pointsName: business.pointsName,
            membershipName: business.membershipName,
            welcomeMessage: business.welcomeMessage,
            cardDefaultLanguage: business.cardDefaultLanguage,
            staffAttributionEnabled: business.staffAttributionEnabled,
            staffAttributionRequired: business.staffAttributionRequired,
            loyaltyMode: business.loyaltyMode,
            unitName: business.unitName,
            rewardName: business.rewardName,
            rewardType: business.rewardType,
            rewardCode: business.rewardCode,
            rewardDescription: business.rewardDescription,
            rewardThreshold: business.rewardThreshold,
            earnAmount: business.earnAmount,
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
          saved={query.saved === "1"}
          error={query.error === "invalid"}
          action={updateSettings}
        />
      </div>
    </main>
  );
}
