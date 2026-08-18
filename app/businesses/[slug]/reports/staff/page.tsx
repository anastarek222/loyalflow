import { auth } from "@/auth";
import { ReportNavigation } from "@/components/reports/report-navigation";
import {
  getDefaultUtcDateRange,
  parseReportDateRange,
} from "@/lib/analytics/date-range";
import {
  getCanonicalStaffAttribution,
  getReportQueryString,
  resolveReportScope,
} from "@/lib/analytics/report-filters";
import { getRedemptionMagnitude } from "@/lib/analytics/metrics";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
import {
  getExperienceModeCookieName,
  resolveExperienceMode,
} from "@/lib/experience-mode";
import {
  getLanguageLocale,
  normalizeLanguage,
  type AppLanguage,
} from "@/lib/i18n";
import { reportCopy } from "@/lib/reports/presentation";
import { hasFeatureEntitlement } from "@/lib/entitlements";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

type StaffReportsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
    branch?: string;
    staff?: string;
  }>;
};

const fieldClass =
  "min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft";

function roleLabel(role: string, language: AppLanguage) {
  const labels: Record<string, [string, string]> = {
    OWNER: ["مالك", "Owner"],
    MANAGER: ["مدير", "Manager"],
    STAFF: ["موظف / كاشير", "Staff / cashier"],
    VIEWER: ["مشاهد", "Viewer"],
    SUPER_ADMIN: ["مدير النظام", "System administrator"],
    SYSTEM: ["النظام", "System"],
  };
  const label = labels[role];
  return label ? (language === "AR" ? label[0] : label[1]) : role;
}

export default async function StaffReportsPage({
  params,
  searchParams,
}: StaffReportsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
      unitName: true,
      isActive: true,
      plan: true,
    },
  });
  if (!business) notFound();

  const theme = getBusinessTheme(business);
  const reportUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, language: true, role: true, experienceAccess: true },
  });
  const language = normalizeLanguage(reportUser?.language);
  const experienceMode = resolveExperienceMode(
    (await cookies()).get(getExperienceModeCookieName(session.user.id))?.value,
    reportUser?.role ?? session.user.role,
    reportUser?.experienceAccess,
  );
  const simple = experienceMode === "SIMPLE";
  const copy = reportCopy(language);
  const numberFormatter = new Intl.NumberFormat(getLanguageLocale(language));
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);

  if (!canPerform(session.user, business.id, "REPORTS_VIEW")) {
    redirect(`/businesses/${business.slug}`);
  }
  if (!hasFeatureEntitlement(business.plan, "REPORTING")) {
    redirect(`/businesses/${business.slug}?error=plan-feature`);
  }

  const dateRange =
    parseReportDateRange({ from: query.from, to: query.to }) ??
    getDefaultUtcDateRange();
  const { fromInput, toInput, from, to } = dateRange;

  const [users, reportBranches] = await Promise.all([
    prisma.user.findMany({
      where: { businessId: business.id },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        businessId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
    }),
    prisma.branch.findMany({
      where: { businessId: business.id },
      select: { id: true, businessId: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const reportScope =
    resolveReportScope({
      businessId: business.id,
      branchId: query.branch,
      staffId: query.staff,
      branches: reportBranches,
      staff: users,
    }) ?? {};

  const [transactions, rewardRedemptions] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where: {
        businessId: business.id,
        createdAt: { gte: from, lte: to },
        ...reportScope,
      },
      select: {
        type: true,
        amount: true,
        customerId: true,
        attributedStaffId: true,
      },
    }),
    prisma.rewardRedemption.findMany({
      where: {
        businessId: business.id,
        createdAt: { gte: from, lte: to },
        ...reportScope,
      },
      select: { customerId: true, attributedStaffId: true },
    }),
  ]);

  type PerformanceRow = {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    earnActions: number;
    earnedAmount: number;
    redeemActions: number;
    redeemedAmount: number;
    adjustmentActions: number;
    rewardRedemptions: number;
    customers: Set<string>;
  };

  const performance = new Map<string, PerformanceRow>();
  for (const user of users) {
    performance.set(user.id, {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" "),
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      earnActions: 0,
      earnedAmount: 0,
      redeemActions: 0,
      redeemedAmount: 0,
      adjustmentActions: 0,
      rewardRedemptions: 0,
      customers: new Set<string>(),
    });
  }

  let systemRow: PerformanceRow | null = null;
  const getSystemRow = () => {
    if (!systemRow) {
      systemRow = {
        id: "system",
        name: t("النظام أو مستخدم محذوف", "System or deleted user"),
        email: "—",
        role: "SYSTEM",
        isActive: false,
        earnActions: 0,
        earnedAmount: 0,
        redeemActions: 0,
        redeemedAmount: 0,
        adjustmentActions: 0,
        rewardRedemptions: 0,
        customers: new Set<string>(),
      };
    }
    return systemRow;
  };

  for (const transaction of transactions) {
    const creditedStaffId = getCanonicalStaffAttribution(transaction);
    const row = creditedStaffId
      ? performance.get(creditedStaffId) ?? getSystemRow()
      : getSystemRow();

    row.customers.add(transaction.customerId);
    switch (transaction.type) {
      case "EARN":
        row.earnActions += 1;
        row.earnedAmount += Math.max(0, transaction.amount);
        break;
      case "REDEEM":
        row.redeemActions += 1;
        row.redeemedAmount += getRedemptionMagnitude(transaction.amount);
        break;
      case "ADJUSTMENT":
        row.adjustmentActions += 1;
        break;
    }
  }

  // Reward-redemption credit is shown only when persisted attribution exists;
  // it never falls back to the currently logged-in user or operation creator.
  for (const redemption of rewardRedemptions) {
    const creditedStaffId = getCanonicalStaffAttribution(redemption);
    const row = creditedStaffId
      ? performance.get(creditedStaffId) ?? getSystemRow()
      : getSystemRow();
    row.customers.add(redemption.customerId);
    row.rewardRedemptions += 1;
  }

  const rows = [
    ...performance.values(),
    ...(systemRow ? [systemRow] : []),
  ]
    .map((row) => ({
      ...row,
      customersCount: row.customers.size,
      totalActions:
        row.earnActions + row.redeemActions + row.adjustmentActions,
    }))
    .sort(
      (first, second) =>
        second.totalActions - first.totalActions ||
        second.customersCount - first.customersCount,
    );

  const totalActions = rows.reduce((total, row) => total + row.totalActions, 0);
  const totalEarned = rows.reduce((total, row) => total + row.earnedAmount, 0);
  const totalRedeemed = rows.reduce(
    (total, row) => total + row.redeemedAmount,
    0,
  );
  const activeUsers = users.filter((user) => user.isActive).length;

  const reportQuery = getReportQueryString({
    from: fromInput,
    to: toInput,
    branchId: reportScope.branchId,
    attributedStaffId: reportScope.attributedStaffId,
  });

  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-8 sm:py-8"
      dir={language === "AR" ? "rtl" : "ltr"}
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <div
        className="mx-auto max-w-7xl"
        data-experience-mode={experienceMode}
        data-staff-reports-workspace="true"
      >
        <Link
          href={`/businesses/${business.slug}/reports?${reportQuery}`}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-foreground-muted transition-colors hover:text-primary"
        >
          {t("العودة إلى التقارير", "Back to reports")}
        </Link>

        <header className="relative mt-5 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="pointer-events-none absolute end-0 top-0 size-64 rounded-full bg-[radial-gradient(circle,var(--lf-primary-soft),transparent_68%)]" />
          <div className="relative max-w-3xl">
            <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              {copy.staff}
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {copy.staff}
            </h1>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              {simple
                ? copy.simple
                : t(
                    "قارن العمليات المنسوبة المثبتة لكل مستخدم بدون تغيير سجل الإسناد التاريخي.",
                    "Compare persisted staff attribution without changing historical attribution records.",
                  )}
            </p>
          </div>
        </header>

        <ReportNavigation
          slug={business.slug}
          active="staff"
          query={getReportQueryString({
            from: fromInput,
            to: toInput,
            branchId: reportScope.branchId,
            attributedStaffId: reportScope.attributedStaffId,
          })}
          language={language}
        />

        <form
          method="get"
          className="mt-5 grid gap-4 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:grid-cols-2 sm:p-6 xl:grid-cols-4"
          aria-label={t("فلاتر أداء الفريق", "Staff performance filters")}
        >
          <div>
            <label
              htmlFor="from"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
              {t("من تاريخ", "From date")}
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={fromInput}
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
              {t("إلى تاريخ", "To date")}
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={toInput}
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="branch"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
              {t("الفرع", "Branch")}
            </label>
            <select
              id="branch"
              name="branch"
              defaultValue={reportScope.branchId ?? "all"}
              className={fieldClass}
            >
              <option value="all">
                {t(
                  "كل الفروع والسجل التاريخي",
                  "All branches and historical records",
                )}
              </option>
              {reportBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                  {branch.isActive ? "" : t(" (غير نشط)", " (inactive)")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="staff"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
              {t("الموظف المنسوب إليه", "Attributed staff")}
            </label>
            <select
              id="staff"
              name="staff"
              defaultValue={reportScope.attributedStaffId ?? "all"}
              className={fieldClass}
            >
              <option value="all">
                {t(
                  "كل الموظفين والعمليات غير المنسوبة",
                  "All staff and unattributed operations",
                )}
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    t("مستخدم بدون اسم", "Unnamed user")}
                  {user.isActive ? "" : t(" (غير نشط)", " (inactive)")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              {t("تطبيق الفلاتر", "Apply filters")}
            </button>
            <Link
              href={`/businesses/${business.slug}/reports/staff`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] border border-border bg-surface px-5 text-sm font-bold text-foreground-muted transition-colors hover:border-primary/40 hover:text-primary"
            >
              {t("إعادة ضبط", "Reset")}
            </Link>
          </div>
        </form>

        <p
          className="mt-3 rounded-[var(--lf-radius-input)] bg-surface-subtle px-4 py-3 text-sm text-foreground-muted"
          role="status"
        >
          {reportScope.branchId
            ? `${t("سياق الفرع", "Branch context")}: ${
                reportBranches.find((branch) => branch.id === reportScope.branchId)
                  ?.name ?? "—"
              }`
            : t(
                "يشمل التقرير العمليات التاريخية غير المنسوبة إلى فرع.",
                "This report includes historical operations with no branch attribution.",
              )}
        </p>

        <section
          className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"
          aria-label={t("ملخص أداء الفريق", "Staff performance summary")}
        >
          {[
            {
              label: t("المستخدمون النشطون", "Active users"),
              value: numberFormatter.format(activeUsers),
              tone: "default",
            },
            {
              label: t("إجمالي العمليات", "Total operations"),
              value: numberFormatter.format(totalActions),
              tone: "default",
            },
            {
              label: t("الرصيد المضاف", "Earned balance"),
              value: numberFormatter.format(totalEarned),
              tone: "success",
            },
            {
              label: t("الرصيد المستبدل", "Redeemed balance"),
              value: numberFormatter.format(totalRedeemed),
              tone: "warning",
            },
          ].map((metric) => (
            <article
              key={metric.label}
              className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5"
            >
              <p className="text-xs font-semibold text-foreground-subtle sm:text-sm">
                {metric.label}
              </p>
              <p
                className={`lf-type-numeric mt-2 text-2xl font-black sm:text-3xl ${
                  metric.tone === "success"
                    ? "text-emerald-700"
                    : metric.tone === "warning"
                      ? "text-amber-700"
                      : "text-foreground"
                }`}
              >
                {metric.value}
              </p>
              {(metric.tone === "success" || metric.tone === "warning") && (
                <p dir="auto" className="mt-1 text-xs text-foreground-subtle">
                  {business.unitName}
                </p>
              )}
            </article>
          ))}
        </section>

        {rows.length === 0 ? (
          <section className="mt-5 rounded-[var(--lf-radius-card)] border border-dashed border-border bg-surface p-10 text-center">
            <h2 className="text-xl font-black text-foreground">
              {t("لا يوجد مستخدمون", "No users found")}
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">{copy.noData}</p>
          </section>
        ) : (
          <>
            <section
              className={`${simple ? "hidden" : "hidden lg:block"} mt-5 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm`}
              aria-label={t("جدول أداء الفريق", "Staff performance table")}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead className="bg-surface-subtle text-xs font-bold uppercase tracking-wide text-foreground-subtle">
                    <tr>
                      <th className="px-5 py-4">{t("المستخدم", "User")}</th>
                      <th className="px-5 py-4">{t("العملاء", "Customers")}</th>
                      <th className="px-5 py-4">{t("إضافات", "Earn actions")}</th>
                      <th className="px-5 py-4">{t("القيمة المضافة", "Earned value")}</th>
                      <th className="px-5 py-4">{t("استبدالات", "Redeem actions")}</th>
                      <th className="px-5 py-4">{t("القيمة المستبدلة", "Redeemed value")}</th>
                      <th className="px-5 py-4">{t("مكافآت مستبدلة", "Reward redemptions")}</th>
                      <th className="px-5 py-4">{t("تعديلات", "Adjustments")}</th>
                      <th className="px-5 py-4">{t("الإجمالي", "Total")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-surface-subtle/60">
                        <td className="px-5 py-4">
                          <p dir="auto" className="font-black text-foreground">
                            {row.name}
                          </p>
                          <p
                            dir="ltr"
                            className="mt-1 text-start text-xs text-foreground-subtle"
                          >
                            {row.email}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                              {roleLabel(row.role, language)}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                row.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-surface-subtle text-foreground-subtle"
                              }`}
                            >
                              {row.isActive
                                ? t("نشط", "Active")
                                : t("غير نشط", "Inactive")}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-foreground">
                          {numberFormatter.format(row.customersCount)}
                        </td>
                        <td className="px-5 py-4 font-bold text-foreground">
                          {numberFormatter.format(row.earnActions)}
                        </td>
                        <td className="px-5 py-4 font-bold text-emerald-700">
                          {numberFormatter.format(row.earnedAmount)}
                        </td>
                        <td className="px-5 py-4 font-bold text-foreground">
                          {numberFormatter.format(row.redeemActions)}
                        </td>
                        <td className="px-5 py-4 font-bold text-amber-700">
                          {numberFormatter.format(row.redeemedAmount)}
                        </td>
                        <td className="px-5 py-4 font-bold text-foreground">
                          {numberFormatter.format(row.rewardRedemptions)}
                        </td>
                        <td className="px-5 py-4 font-bold text-foreground">
                          {numberFormatter.format(row.adjustmentActions)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex min-w-12 justify-center rounded-full bg-primary-soft px-3 py-1.5 font-black text-primary">
                            {numberFormatter.format(row.totalActions)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section
              className={`${simple ? "hidden" : "lg:hidden"} mt-5 space-y-3`}
              aria-label={t("بطاقات أداء الفريق", "Staff performance cards")}
            >
              {rows.map((row) => (
                <article
                  key={row.id}
                  className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2
                        dir="auto"
                        className="truncate text-lg font-black text-foreground"
                      >
                        {row.name}
                      </h2>
                      <p
                        dir="ltr"
                        className="mt-1 truncate text-start text-xs text-foreground-subtle"
                      >
                        {row.email}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-primary">
                        {roleLabel(row.role, language)} · {row.isActive ? t("نشط", "Active") : t("غير نشط", "Inactive")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-black text-primary">
                      {numberFormatter.format(row.totalActions)} {t("عملية", "operations")}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3">
                      <p className="text-foreground-subtle">
                        {t("العملاء", "Customers")}
                      </p>
                      <p className="mt-1 font-black text-foreground">
                        {numberFormatter.format(row.customersCount)}
                      </p>
                    </div>
                    <div className="rounded-[var(--lf-radius-input)] bg-amber-50 p-3">
                      <p className="text-amber-800">
                        {t("مكافآت مستبدلة", "Reward redemptions")}
                      </p>
                      <p className="mt-1 font-black text-amber-950">
                        {numberFormatter.format(row.rewardRedemptions)}
                      </p>
                    </div>
                    <div className="rounded-[var(--lf-radius-input)] bg-emerald-50 p-3">
                      <p className="text-emerald-700">
                        {t("الرصيد المضاف", "Earned balance")}
                      </p>
                      <p className="mt-1 font-black text-emerald-900">
                        {numberFormatter.format(row.earnedAmount)}
                      </p>
                    </div>
                    <div className="rounded-[var(--lf-radius-input)] bg-amber-50 p-3">
                      <p className="text-amber-700">
                        {t("الرصيد المستبدل", "Redeemed balance")}
                      </p>
                      <p className="mt-1 font-black text-amber-900">
                        {numberFormatter.format(row.redeemedAmount)}
                      </p>
                    </div>
                    <div className="rounded-[var(--lf-radius-input)] bg-primary-soft p-3">
                      <p className="text-primary">
                        {t("التعديلات", "Adjustments")}
                      </p>
                      <p className="mt-1 font-black text-foreground">
                        {numberFormatter.format(row.adjustmentActions)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
