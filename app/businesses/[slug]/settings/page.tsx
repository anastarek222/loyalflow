import { auth } from "@/auth";
import BusinessSettingsForm from "@/components/business-settings-form";
import CardBusinessDetailsForm from "@/components/card-business-details-form";
import { BusinessDeletionDangerZone } from "@/components/business-deletion-danger-zone";
import { getRequestBaseUrl } from "@/lib/app-url";
import { canManageBusiness } from "@/lib/permissions";
import { canDeleteBusiness } from "@/lib/business/deletion";
import prisma from "@/lib/prisma";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { getPlanUsage, planCatalog } from "@/lib/entitlements";
import { getEffectivePlanLimits } from "@/lib/entitlements-server";
import { getGoogleSheetsConfiguration } from "@/lib/google-sheets";
import Link from "next/link";
import {
  Building2,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  DatabaseBackup,
  QrCode,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import * as QRCode from "qrcode";

import {
  deleteBusinessAction,
  updateBusinessCardDetailsAction,
  updateBusinessProfileAction,
  updateOperationsSettingsAction,
} from "./actions";
import { updateBusinessExportPermissionCommandAction } from "./export-permission-action";
import { syncGoogleSheetCommandAction } from "./google-sheets-sync-action";

type BusinessSettingsPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    profile?: string;
    operations?: string;
    sheetSync?: string;
    cardSaved?: string;
    cardError?: string;
    exportPermissionSaved?: string;
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

  const [
    customerCount,
    userCount,
    branchCount,
    offerCount,
    rewardCount,
    effectivePlanLimits,
  ] = await Promise.all([
    prisma.customer.count({ where: { businessId: business.id } }),
    prisma.user.count({ where: { businessId: business.id } }),
    prisma.branch.count({ where: { businessId: business.id } }),
    prisma.offer.count({ where: { businessId: business.id } }),
    prisma.reward.count({ where: { businessId: business.id } }),
    getEffectivePlanLimits(business.plan),
  ]);
  const planUsage = getPlanUsage(
    business.plan,
    {
      CUSTOMERS: customerCount,
      USERS: userCount,
      BRANCHES: branchCount,
      OFFERS: offerCount,
      REWARDS: rewardCount,
    },
    effectivePlanLimits,
  );

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const language = normalizeLanguage(currentUser?.language);
  const locale = getLanguageLocale(language);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const googleSheetsConfiguration = getGoogleSheetsConfiguration();
  const googleSheetsStatus = !googleSheetsConfiguration.configured
    ? t("غير مهيأ", "Not configured")
    : business.googleSheetsSyncState === "SUCCEEDED"
      ? t("آخر مزامنة نجحت", "Last sync succeeded")
      : business.googleSheetsSyncState === "FAILED"
        ? t("فشلت آخر مزامنة", "Last sync failed")
        : t("المزامنة قيد الانتظار", "Sync pending");

  const updateBusinessProfile = updateBusinessProfileAction.bind(
    null,
    business.slug,
  );
  const updateOperationsSettings = updateOperationsSettingsAction.bind(
    null,
    business.slug,
  );
  const deleteBusiness = deleteBusinessAction.bind(null, business.slug);
  const syncGoogleSheet = syncGoogleSheetCommandAction.bind(null, business.slug);
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
    <main
      className="min-h-screen px-4 py-6 sm:px-6 sm:py-8"
      dir={language === "AR" ? "rtl" : "ltr"}
    >
      <div
        className="mx-auto max-w-7xl"
        data-settings-administration="true"
      >
        <Link
          href={`/businesses/${business.slug}`}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-foreground-muted transition-colors hover:text-primary"
        >
          {t("الرجوع إلى", "Back to")} {business.name}
        </Link>

        <header className="relative mb-6 mt-4 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="pointer-events-none absolute end-0 top-0 size-64 rounded-full bg-[radial-gradient(circle,var(--lf-primary-soft),transparent_68%)]" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                <Settings2 className="size-4" aria-hidden="true" />
                {t("مركز إدارة النشاط", "Business control centre")}
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {t("إعدادات النشاط", "Business settings")}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-foreground-muted">
                {t(
                  "إدارة الملف التعريفي والتشغيل والتكاملات الخاصة بالنشاط.",
                  "Manage the business profile, operations, and integrations.",
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full border border-border bg-surface px-3 py-2 text-foreground-muted">
                {planCatalog[business.plan].name}
              </span>
              <span className="rounded-full border border-border bg-surface px-3 py-2 text-foreground-muted">
                {googleSheetsStatus}
              </span>
            </div>
          </div>
        </header>

        <nav
          aria-label={t("أقسام الإعدادات", "Settings sections")}
          className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          data-settings-section-links="true"
        >
          {[
            ["profile-settings", t("ملف النشاط", "Business profile"), Building2],
            ["operations-settings", t("التشغيل", "Operations"), Settings2],
            ["customer-card-settings", t("بيانات الكارت", "Card details"), QrCode],
            ["integration-settings", t("التكاملات", "Integrations"), DatabaseBackup],
          ].map(([id, label, Icon]) => (
            <a
              key={id as string}
              href={`#${id}`}
              className="flex min-h-12 items-center gap-3 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-bold text-foreground-muted transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label as string}
            </a>
          ))}
        </nav>

        <section
          className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
          data-plan-usage="true"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">
                <ChartNoAxesColumnIncreasing className="size-4" aria-hidden="true" />
                {t("الخطة الحالية", "Current plan")}
              </p>
              <h2 className="mt-1 text-xl font-black text-foreground">
                {planCatalog[business.plan].name}
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                {t(
                  "الحدود تُطبق على الخادم. تغيير الخطة يتم بواسطة مدير المنصة.",
                  "Limits are enforced server-side. Plan changes are managed by the platform administrator.",
                )}
              </p>
            </div>
            {session.user.role === "SUPER_ADMIN" ? (
              <Link
                href="/business-owners"
                className="text-sm font-semibold text-primary hover:underline"
              >
                {t("إدارة الخطة", "Manage plan")}
              </Link>
            ) : null}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {planUsage.map((item) => (
              <div
                key={item.resource}
                className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-3"
              >
                <p className="text-[11px] font-semibold text-foreground-subtle">
                  {item.resource.replaceAll("_", " ")}
                </p>
                <p dir="ltr" className="mt-1 font-bold text-foreground">
                  {item.used} / {item.limit ?? "∞"}
                </p>
                {item.limit ? (
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, (item.used / item.limit) * 100)}%`,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {query.sheetSync === "success" && (
          <div
            role="status"
            className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success"
          >
            {t("تمت مزامنة Google Sheets بنجاح.", "Google Sheets synced successfully.")}
          </div>
        )}

        {query.sheetSync === "error" && (
          <div
            role="alert"
            className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger"
          >
            {t(
              "تعذرت مزامنة Google Sheets. حاول مرة أخرى.",
              "Google Sheets sync failed. Please try again.",
            )}
          </div>
        )}

        {query.sheetSync === "subscription-restricted" && (
          <div
            role="alert"
            className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger"
          >
            {t(
              "لا يمكن تشغيل مزامنة Google Sheets في حالة الاشتراك الحالية.",
              "Google Sheets sync cannot run in the current subscription state.",
            )}
          </div>
        )}

        {query.exportPermissionSaved === "1" && (
          <div
            role="status"
            className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success"
          >
            {t("تم حفظ صلاحية تصدير البيانات.", "Data export permission saved.")}
          </div>
        )}

        {query.exportPermissionSaved === "subscription-restricted" && (
          <div
            role="alert"
            className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger"
          >
            {t(
              "لا يمكن تغيير صلاحية تصدير البيانات في حالة الاشتراك الحالية.",
              "Data export permission cannot be changed in the current subscription state.",
            )}
          </div>
        )}

        <section
          id="integration-settings"
          className="scroll-mt-24"
          data-settings-integrations="true"
        >
          <details className="group mb-3 rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
              <span>
                <span className="block text-sm font-bold text-foreground">
                  {t("QR لانضمام العملاء", "Customer join QR")}
                </span>
                <span className="mt-0.5 block text-xs text-foreground-subtle">
                  {t(
                    "افتحه عند الطباعة أو مشاركة رابط التسجيل.",
                    "Open it when printing or sharing the enrolment link.",
                  )}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                {t("عرض", "Show")}
                <ChevronDown
                  className="size-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </span>
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
                  {t(
                    "اطبع هذا الرمز أو شارك الرابط حتى يسجل العملاء بأنفسهم ويستلموا كارتهم الرقمي.",
                    "Print this code or share the link so customers can enrol themselves and receive their digital card.",
                  )}
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
                alt={t(
                  `QR للتسجيل الذاتي في ${business.name}`,
                  `Self-enrolment QR for ${business.name}`,
                )}
                className="h-48 w-48 rounded-[var(--lf-radius-card)] border border-border bg-white p-2"
              />
            </div>
          </details>

          <details className="group mb-6 rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
              <span>
                <span className="block text-sm font-bold text-foreground">
                  {t("تكامل Google Sheets", "Google Sheets integration")}
                </span>
                <span className="mt-0.5 block text-xs text-foreground-subtle">
                  {t(
                    "راجع حالة النسخ الاحتياطي وشغّل المزامنة عند الحاجة.",
                    "Review backup status and run a sync when needed.",
                  )}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                {t("إظهار", "Show")}
                <ChevronDown
                  className="size-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </span>
            </summary>
            <div className="border-t border-border p-4 sm:p-5">
              <section className="mb-0 flex flex-col gap-4 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {t("النسخ الاحتياطي على Google Sheets", "Google Sheets backup")}
                  </h2>
                  <p className="mt-1 text-sm text-foreground-subtle">
                    {t(
                      "إرسال أحدث بيانات العملاء والأرصدة والمكافآت إلى ملف النشاط.",
                      "Send the latest customers, balances, and rewards to the business sheet.",
                    )}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {t("الحالة: ", "Status: ")}
                    {googleSheetsStatus}
                    {business.googleSheetsLastSyncedAt
                      ? ` · ${t("آخر نجاح", "Last success")} ${business.googleSheetsLastSyncedAt.toLocaleString(locale)}`
                      : ""}
                    {business.googleSheetsSyncState === "FAILED" && business.googleSheetsRetryable
                      ? ` · ${t("يمكن إعادة المحاولة", "Retry available")}`
                      : ""}
                  </p>
                </div>

                <form action={syncGoogleSheet}>
                  <button
                    type="submit"
                    className="w-full rounded-[var(--lf-radius-input)] bg-success px-6 py-4 font-semibold text-[var(--lf-inverse)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 sm:w-auto"
                  >
                    {business.googleSheetsSyncState === "FAILED"
                      ? t("إعادة محاولة المزامنة", "Retry sync")
                      : t("مزامنة Google Sheets", "Sync Google Sheets")}
                  </button>
                </form>
              </section>
            </div>
          </details>
        </section>

        {query.cardSaved === "1" && (
          <div
            role="status"
            className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success"
          >
            {t("تم حفظ بيانات الكارت بنجاح.", "Card details saved successfully.")}
          </div>
        )}

        {query.cardError === "invalid" && (
          <div
            role="alert"
            className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger"
          >
            {t(
              "راجع رقم الهاتف والعنوان وشروط الكارت.",
              "Review the phone number, address, and card terms.",
            )}
          </div>
        )}

        {query.cardError === "subscription-restricted" && (
          <div
            role="alert"
            className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger"
          >
            {t(
              "لا يمكن تعديل بيانات الكارت في حالة الاشتراك الحالية.",
              "Card details cannot be changed in the current subscription state.",
            )}
          </div>
        )}

        <details
          id="customer-card-settings"
          className="group mb-6 scroll-mt-24 rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm"
          data-settings-card-details="true"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
            <span>
              <span className="block text-sm font-bold text-foreground">
                {t("بيانات كارت العميل", "Customer card details")}
              </span>
              <span className="mt-0.5 block text-xs text-foreground-subtle">
                {t(
                  "الهاتف والعنوان وشروط الكارت عند الحاجة.",
                  "Phone, address and card terms when needed.",
                )}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
              {t("تعديل", "Edit")}
              <ChevronDown
                className="size-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </span>
          </summary>
          <div className="border-t border-border p-4 sm:p-5">
            <CardBusinessDetailsForm
              contactPhone={business.contactPhone ?? ""}
              address={business.address ?? ""}
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
                    ]
                ).join("\n")
              }
              language={language}
              action={updateCardDetails}
            />
          </div>
        </details>

        {session.user.role === "SUPER_ADMIN" ? (
          <section
            className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
            data-export-permission="true"
          >
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-black text-primary">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    {t("إعدادات مدير النظام", "System administrator settings")}
                  </span>
                </p>
                <h2 className="mt-1 text-xl font-black text-foreground">
                  {t("صلاحية تصدير البيانات", "Data export permission")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
                  {t(
                    "عند التفعيل يستطيع مالك النشاط تصدير العملاء وتقارير الحركات. الموظفون لا يحصلون على صلاحية التصدير.",
                    "When enabled, the owner can export customers and transaction reports. Staff do not receive export permission.",
                  )}
                </p>
              </div>

              <form
                action={updateBusinessExportPermissionCommandAction.bind(
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
                  className="rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-black text-[var(--lf-primary-foreground)] transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {t("حفظ صلاحية التصدير", "Save export permission")}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section
            className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
            data-export-permission="true"
          >
            <p className="text-sm font-bold text-foreground-subtle">
              {t("تصدير البيانات", "Data export")}
            </p>
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
            coverImageUrl: business.coverImageUrl,
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
            staffAttributionEnabled: business.staffAttributionEnabled,
            staffAttributionRequired: business.staffAttributionRequired,
          }}
          status={{
            profile:
              query.profile === "saved" ||
              query.profile === "invalid" ||
              query.profile === "subscription-restricted"
                ? query.profile
                : undefined,
            operations:
              query.operations === "saved" ||
              query.operations === "invalid" ||
              query.operations === "subscription-restricted"
                ? query.operations
                : undefined,
          }}
          actions={{
            profile: updateBusinessProfile,
            operations: updateOperationsSettings,
          }}
        />
        {canDeleteBusiness(session.user, business.id) ? (
          <BusinessDeletionDangerZone
            action={deleteBusiness}
            businessName={business.name}
            language={language}
          />
        ) : null}
      </div>
    </main>
  );
}
