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
      style={{ backgroundColor: theme.backgroundColor, fontFamily: theme.fontFamily }}
    >
      <div
        className="mx-auto max-w-7xl"
        data-experience-mode={experienceMode}
        dir={language === "AR" ? "rtl" : "ltr"}
      >
        <Link
          href={`/businesses/${business.slug}/reports?${reportQuery}`}
          className="text-sm font-bold text-violet-700 hover:text-violet-900"
        >
          {t("العودة إلى التقارير ←", "← Back to reports")}
        </Link>

        <header
          className={`mt-5 border p-5 text-white sm:p-8 ${theme.cardClass} ${theme.borderClass}`}
          style={{ backgroundColor: theme.primaryColor }}
        >
          <p className="text-sm font-bold text-white/70">{copy.staff}</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">{copy.staff}</h1>
          <p className="mt-2 text-sm leading-6 text-white/75">
            {simple
              ? copy.simple
              : t(
                  "مقارنة العمليات المنسوبة المثبتة لكل مستخدم.",
                  "Compare operations with persisted staff attribution.",
                )}
          </p>
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
          className={`mt-6 grid gap-4 border bg-white p-5 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end sm:p-6 ${theme.cardClass} ${theme.borderClass}`}
        >
          <div>
            <label htmlFor="from" className="mb-2 block text-sm font-bold text-slate-700">
              {t("من تاريخ", "From")}
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={fromInput}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label htmlFor="branch" className="mb-2 block text-sm font-bold text-slate-700">
              {t("الفرع", "Branch")}
            </label>
            <select
              id="branch"
              name="branch"
              defaultValue={reportScope.branchId ?? "all"}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
            >
              <option value="all">
                {t("كل الفروع والسجل التاريخي", "All branches and historical records")}
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
            <label htmlFor="staff" className="mb-2 block text-sm font-bold text-slate-700">
              {t("الموظف المنسوب إليه", "Attributed staff")}
            </label>
            <select
              id="staff"
              name="staff"
              defaultValue={reportScope.attributedStaffId ?? "all"}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
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

          <div>
            <label htmlFor="to" className="mb-2 block text-sm font-bold text-slate-700">
              {t("إلى تاريخ", "To")}
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={toInput}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white transition hover:bg-violet-700"
          >
            {t("تطبيق الفترة", "Apply period")}
          </button>

          <Link
            href={`/businesses/${business.slug}/reports/staff`}
            className="rounded-xl border border-slate-300 px-6 py-3 text-center font-bold text-slate-700"
          >
            {t("آخر 30 يومًا", "Last 30 days")}
          </Link>
        </form>

        <p className="mt-3 text-sm text-slate-600" role="status">
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

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              {t("المستخدمون النشطون", "Active users")}
            </p>
            <p className="mt-3 text-3xl font-black text-slate-950">
              {numberFormatter.format(activeUsers)}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              {t("إجمالي العمليات", "Total operations")}
            </p>
            <p className="mt-3 text-3xl font-black text-slate-950">
              {numberFormatter.format(totalActions)}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              {t("الرصيد المضاف", "Earned balance")}
            </p>
            <p className="mt-3 text-3xl font-black text-emerald-700">
              {numberFormatter.format(totalEarned)}
            </p>
            <p dir="auto" className="mt-1 text-xs text-slate-500">
              {business.unitName}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              {t("الرصيد المستبدل", "Redeemed balance")}
            </p>
            <p className="mt-3 text-3xl font-black text-amber-700">
              {numberFormatter.format(totalRedeemed)}
            </p>
            <p dir="auto" className="mt-1 text-xs text-slate-500">
              {business.unitName}
            </p>
          </article>
        </section>

        {rows.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-black text-slate-950">
              {t("لا يوجد مستخدمون", "No users found")}
            </h2>
          </section>
        ) : (
          <>
            <section
              className={`${simple ? "hidden" : "hidden lg:block"} mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead className="bg-slate-950 text-sm text-white">
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
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p dir="auto" className="font-black text-slate-950">
                            {row.name}
                          </p>
                          <p dir="ltr" className="mt-1 text-start text-xs text-slate-500">
                            {row.email}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                              {roleLabel(row.role, language)}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                row.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {row.isActive ? t("نشط", "Active") : t("غير نشط", "Inactive")}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold">
                          {numberFormatter.format(row.customersCount)}
                        </td>
                        <td className="px-5 py-4 font-bold">
                          {numberFormatter.format(row.earnActions)}
                        </td>
                        <td className="px-5 py-4 font-bold text-emerald-700">
                          {numberFormatter.format(row.earnedAmount)}
                        </td>
                        <td className="px-5 py-4 font-bold">
                          {numberFormatter.format(row.redeemActions)}
                        </td>
                        <td className="px-5 py-4 font-bold text-amber-700">
                          {numberFormatter.format(row.redeemedAmount)}
                        </td>
                        <td className="px-5 py-4 font-bold">
                          {numberFormatter.format(row.rewardRedemptions)}
                        </td>
                        <td className="px-5 py-4 font-bold">
                          {numberFormatter.format(row.adjustmentActions)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex min-w-12 justify-center rounded-full bg-slate-950 px-3 py-1.5 font-black text-white">
                            {numberFormatter.format(row.totalActions)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`${simple ? "hidden" : "lg:hidden"} mt-6 space-y-4`}>
              {rows.map((row) => (
                <article
                  key={row.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 dir="auto" className="truncate text-lg font-black text-slate-950">
                        {row.name}
                      </h2>
                      <p dir="ltr" className="mt-1 truncate text-start text-xs text-slate-500">
                        {row.email}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-black text-white">
                      {numberFormatter.format(row.totalActions)} {t("عملية", "operations")}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-500">{t("العملاء", "Customers")}</p>
                      <p className="mt-1 font-black">
                        {numberFormatter.format(row.customersCount)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-amber-800">
                        {t("مكافآت مستبدلة", "Reward redemptions")}
                      </p>
                      <p className="mt-1 font-black text-amber-950">
                        {numberFormatter.format(row.rewardRedemptions)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-emerald-700">
                        {t("الرصيد المضاف", "Earned balance")}
                      </p>
                      <p className="mt-1 font-black text-emerald-900">
                        {numberFormatter.format(row.earnedAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-amber-700">
                        {t("الرصيد المستبدل", "Redeemed balance")}
                      </p>
                      <p className="mt-1 font-black text-amber-900">
                        {numberFormatter.format(row.redeemedAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-3">
                      <p className="text-violet-700">
                        {t("التعديلات", "Adjustments")}
                      </p>
                      <p className="mt-1 font-black text-violet-900">
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
