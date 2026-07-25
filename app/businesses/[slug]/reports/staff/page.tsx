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
import { getExperienceModeCookieName, resolveExperienceMode } from "@/lib/experience-mode";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { reportCopy } from "@/lib/reports/presentation";
import Link from "next/link";
import { cookies } from "next/headers";

import {
  notFound,
  redirect,
} from "next/navigation";

type StaffReportsPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    from?: string;
    to?: string;
    branch?: string;
    staff?: string;
  }>;
};

function roleLabel(role: string, language: "AR" | "EN") {
  const labels: Record<string, { AR: string; EN: string }> = {
    OWNER: { AR: "مالك", EN: "Owner" },
    MANAGER: { AR: "مدير", EN: "Manager" },
    STAFF: { AR: "موظف / كاشير", EN: "Staff / cashier" },
    VIEWER: { AR: "مشاهد", EN: "Viewer" },
    SUPER_ADMIN: { AR: "مدير النظام", EN: "System administrator" },
  };
  return labels[role]?.[language] ?? role;
}

export default async function StaffReportsPage({
  params,
  searchParams,
}: StaffReportsPageProps) {
  const session =
    await auth();

  if (!session?.user) {
    redirect(
      "/login"
    );
  }

  const { slug } =
    await params;

  const query =
    await searchParams;

  const business =
    await prisma.business.findUnique({
      where: {
        slug,
      },

      select: {
        id:
          true,
        name:
          true,
        slug:
          true,
        primaryColor:
          true,
        secondaryColor:
          true,
        themePreset:
          true,
        cardStyle:
          true,
        fontFamily:
          true,
        unitName:
          true,
        isActive:
          true,
      },
    });

  if (!business) {
    notFound();
  }

  const reportUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, language: true, role: true, experienceAccess: true } });
  const language = normalizeLanguage(reportUser?.language);
  const t = (ar: string, en: string) => language === "AR" ? ar : en;
  const experienceMode = resolveExperienceMode((await cookies()).get(getExperienceModeCookieName(session.user.id))?.value, reportUser?.role ?? session.user.role, reportUser?.experienceAccess);
  const simple = experienceMode === "SIMPLE";
  const copy = reportCopy(language);
  const numberFormatter = new Intl.NumberFormat(getLanguageLocale(language));

  const canViewReports =
    canPerform(
      session.user,
      business.id,
      "REPORTS_VIEW"
    );

  if (!canViewReports) {
    redirect(
      `/businesses/${business.slug}`
    );
  }

  const dateRange = parseReportDateRange({
    from: query.from,
    to: query.to,
  }) ?? getDefaultUtcDateRange();
  const { fromInput, toInput, from, to } = dateRange;

  const [
    users,
    reportBranches,
  ] =
    await Promise.all([
      prisma.user.findMany({
        where: {
          businessId:
            business.id,
        },

        orderBy: [
          {
            role:
              "asc",
          },

          {
            firstName:
              "asc",
          },
        ],

        select: {
          id:
            true,
          businessId:
            true,
          firstName:
            true,
          lastName:
            true,
          email:
            true,
          role:
            true,
          isActive:
            true,
        },
      }),

      prisma.branch.findMany({
        where: { businessId: business.id },
        select: { id: true, businessId: true, name: true, isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const reportScope = resolveReportScope({
    businessId: business.id,
    branchId: query.branch,
    staffId: query.staff,
    branches: reportBranches,
    staff: users,
  }) ?? {};
  const [transactions, rewardRedemptions] = await Promise.all([prisma.loyaltyTransaction.findMany({
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
  }), prisma.rewardRedemption.findMany({
    where: { businessId: business.id, createdAt: { gte: from, lte: to }, ...reportScope },
    select: { customerId: true, attributedStaffId: true },
  })]);

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

  const performance =
    new Map<
      string,
      PerformanceRow
    >();

  for (
    const user of users
  ) {
    performance.set(
      user.id,
      {
        id:
          user.id,

        name:
          [
            user.firstName,
            user.lastName,
          ]
            .filter(Boolean)
            .join(" "),

        email:
          user.email,

        role:
          user.role,

        isActive:
          user.isActive,

        earnActions:
          0,

        earnedAmount:
          0,

        redeemActions:
          0,

        redeemedAmount:
          0,

        adjustmentActions:
          0,
        rewardRedemptions: 0,

        customers:
          new Set<string>(),
      }
    );
  }

  let systemRow:
    PerformanceRow | null =
      null;

  for (
    const transaction of
      transactions
  ) {
    const creditedStaffId = getCanonicalStaffAttribution(transaction);
    let row =
      creditedStaffId
        ? performance.get(
            creditedStaffId
          )
        : undefined;

    if (!row) {
      if (!systemRow) {
        systemRow = {
          id:
            "system",
          name:
            t("النظام أو مستخدم محذوف", "System or deleted user"),
          email:
            "—",
          role:
            "SYSTEM",
          isActive:
            false,
          earnActions:
            0,
          earnedAmount:
            0,
          redeemActions:
            0,
          redeemedAmount:
            0,
          adjustmentActions:
            0,
          rewardRedemptions: 0,
          customers:
            new Set<string>(),
        };
      }

      row =
        systemRow;
    }

    row.customers.add(
      transaction.customerId
    );

    switch (
      transaction.type
    ) {
      case "EARN":
        row.earnActions +=
          1;

        row.earnedAmount +=
          Math.max(
            0,
            transaction.amount
          );

        break;

      case "REDEEM":
        row.redeemActions +=
          1;

        row.redeemedAmount += getRedemptionMagnitude(transaction.amount);

        break;

      case "ADJUSTMENT":
        row.adjustmentActions +=
          1;

        break;
    }
  }

  // Reward-redemption credit is shown only when persisted attribution exists;
  // it never falls back to the currently logged-in user or operation creator.
  for (const redemption of rewardRedemptions) {
    const creditedStaffId = getCanonicalStaffAttribution(redemption);
    let row = creditedStaffId ? performance.get(creditedStaffId) : undefined;
    if (!row) {
      if (!systemRow) {
        systemRow = { id: "system", name: language === "AR" ? t("النظام أو مستخدم محذوف", "System or deleted user") : "System or deleted user", email: "—", role: "SYSTEM", isActive: false, earnActions: 0, earnedAmount: 0, redeemActions: 0, redeemedAmount: 0, adjustmentActions: 0, rewardRedemptions: 0, customers: new Set<string>() };
      }
      row = systemRow;
    }
    row.customers.add(redemption.customerId);
    row.rewardRedemptions += 1;
  }

  const rows = [
    ...performance.values(),
    ...(systemRow
      ? [systemRow]
      : []),
  ]
    .map(
      (row) => ({
        ...row,

        customersCount:
          row.customers.size,

        totalActions:
          row.earnActions +
          row.redeemActions +
          row.adjustmentActions,
      })
    )
    .sort(
      (
        first,
        second
      ) =>
        second.totalActions -
          first.totalActions ||
        second.customersCount -
          first.customersCount
    );

  const totalActions =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.totalActions,
      0
    );

  const totalEarned =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.earnedAmount,
      0
    );

  const totalRedeemed =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.redeemedAmount,
      0
    );

  const activeUsers =
    users.filter(
      (user) =>
        user.isActive
    ).length;

  const reportQuery = getReportQueryString({
    from: fromInput,
    to: toInput,
    branchId: reportScope.branchId,
    attributedStaffId: reportScope.attributedStaffId,
  });

  return (
    <main
      className="min-h-screen px-4 py-6 sm:px-8 sm:py-8"
    >
      <div className="mx-auto max-w-7xl" data-experience-mode={experienceMode}>
        <Link
          href={`/businesses/${business.slug}/reports?${reportQuery}`}
          className="text-sm font-bold text-primary hover:text-primary"
        >
          {t("العودة إلى التقارير ←", "← Back to reports")}
        </Link>

        <header
          className={`mt-6 border p-6 text-white sm:p-8 rounded-[var(--lf-radius-card)] border-border`}
        >
          <p className="text-sm font-bold text-white/70">
            {copy.staff}
          </p>

          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            {copy.staff}
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/75">
            {simple ? copy.simple : (language === "AR" ? "مقارنة العمليات المنسوبة المثبتة لكل مستخدم." : "Compare operations with persisted staff attribution.")}
          </p>
        </header>

        <ReportNavigation slug={business.slug} active="staff" query={getReportQueryString({ from: fromInput, to: toInput, branchId: reportScope.branchId, attributedStaffId: reportScope.attributedStaffId })} language={language} />

        <form
          method="get"
          className={`mt-6 grid gap-4 border bg-white p-6 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end sm:p-6 rounded-[var(--lf-radius-card)] border-border`}
        >
          <div>
            <label
              htmlFor="from"
              className="mb-2 block text-sm font-bold text-foreground-muted"
            >
              {t("من تاريخ", "From date")}
            </label>

            <input
              id="from"
              name="from"
              type="date"
              defaultValue={
                fromInput
              }
              className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
            />
          </div>

          <div>
            <label htmlFor="branch" className="mb-2 block text-sm font-bold text-foreground-muted">
              {t("الفرع", "Branch")}
            </label>
            <select
              id="branch"
              name="branch"
              defaultValue={reportScope.branchId ?? "all"}
              className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
            >
              <option value="all">{t("كل الفروع والسجل التاريخي", "All branches and historical records")}</option>
              {reportBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}{branch.isActive ? "" : t(" (غير نشط)", " (inactive)")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="staff" className="mb-2 block text-sm font-bold text-foreground-muted">
              {t("الموظف المنسوب إليه", "Attributed staff member")}
            </label>
            <select
              id="staff"
              name="staff"
              defaultValue={reportScope.attributedStaffId ?? "all"}
              className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
            >
              <option value="all">{t("كل الموظفين والعمليات غير المنسوبة", "All staff and unattributed operations")}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || t("مستخدم بدون اسم", "Unnamed user")}
                  {user.isActive ? "" : t(" (غير نشط)", " (inactive)")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-2 block text-sm font-bold text-foreground-muted"
            >
              {t("إلى تاريخ", "To date")}
            </label>

            <input
              id="to"
              name="to"
              type="date"
              defaultValue={
                toInput
              }
              className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
            />
          </div>

          <button
            type="submit"
            className="rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-bold text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle"
          >
            {t("تطبيق الفترة", "Apply period")}
          </button>

          <Link
            href={`/businesses/${business.slug}/reports/staff`}
            className="rounded-[var(--lf-radius-input)] border border-border px-6 py-4 text-center font-bold text-foreground-muted"
          >
            {t("آخر 30 يومًا", "Last 30 days")}
          </Link>
        </form>

        <p className="mt-4 text-sm text-foreground-muted" role="status">
          {reportScope.branchId
            ? `${language === "AR" ? "سياق الفرع" : "Branch context"}: ${reportBranches.find((branch) => branch.id === reportScope.branchId)?.name ?? "—"}`
            : language === "AR" ? "يشمل التقرير العمليات التاريخية غير المنسوبة إلى فرع." : "This report includes historical operations with no branch attribution."}
        </p>

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-foreground-subtle">
              {t("المستخدمون النشطون", "Active users")}
            </p>

            <p className="mt-4 text-3xl font-black text-foreground">
              {numberFormatter.format(
                activeUsers
              )}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-foreground-subtle">
              {t("إجمالي العمليات", "Total operations")}
            </p>

            <p className="mt-4 text-3xl font-black text-foreground">
              {numberFormatter.format(
                totalActions
              )}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-foreground-subtle">
              {t("الرصيد المضاف", "Earned balance")}
            </p>

            <p className="mt-4 text-3xl font-black text-success">
              {numberFormatter.format(
                totalEarned
              )}
            </p>

            <p
              dir="auto"
              className="mt-1 text-xs text-foreground-subtle"
            >
              {business.unitName}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-foreground-subtle">
              {t("الرصيد المستبدل", "Redeemed balance")}
            </p>

            <p className="mt-4 text-3xl font-black text-warning">
              {numberFormatter.format(
                totalRedeemed
              )}
            </p>

            <p
              dir="auto"
              className="mt-1 text-xs text-foreground-subtle"
            >
              {business.unitName}
            </p>
          </article>
        </section>

        {rows.length === 0 ? (
          <section className="mt-6 rounded-[var(--lf-radius-card)] border border-dashed border-border bg-white p-10 text-center">
            <h2 className="text-xl font-black text-foreground">
              {t("لا يوجد مستخدمون", "No users")}
            </h2>
          </section>
        ) : (
          <>
            <section className={`${simple ? "hidden" : "hidden lg:block"} mt-6 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-white shadow-sm`}>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-foreground text-sm text-white">
                    <tr>
                      <th className="px-6 py-4">
                        {t("المستخدم", "User")}
                      </th>

                      <th className="px-6 py-4">
                        {t("العملاء", "Customers")}
                      </th>

                      <th className="px-6 py-4">
                        {t("إضافات", "Earn actions")}
                      </th>

                      <th className="px-6 py-4">
                        {t("القيمة المضافة", "Earned value")}
                      </th>

                      <th className="px-6 py-4">
                        {t("استبدالات", "Redemptions")}
                      </th>

                      <th className="px-6 py-4">
                        {t("القيمة المستبدلة", "Redeemed value")}
                      </th>

                      <th className="px-6 py-4">
                        {t("مكافآت مستبدلة", "Rewards redeemed")}
                      </th>

                      <th className="px-6 py-4">
                        {t("تعديلات", "Adjustments")}
                      </th>

                      <th className="px-6 py-4">
                        {t("الإجمالي", "Total")}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map(
                      (row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-surface-subtle"
                        >
                          <td className="px-6 py-4">
                            <p
                              dir="auto"
                              className="font-black text-foreground"
                            >
                              {row.name}
                            </p>

                            <p
                              dir="ltr"
                              className="mt-1 text-right text-xs text-foreground-subtle"
                            >
                              {row.email}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary">
                                {roleLabel(
                                  row.role,
                                  language
                                )}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  row.isActive
                                    ? "bg-success-subtle text-success"
                                    : "bg-surface-subtle text-foreground-subtle"
                                }`}
                              >
                                {row.isActive
                                  ? t("نشط", "Active")
                                  : t("غير نشط", "Inactive")}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 font-bold">
                            {numberFormatter.format(
                              row.customersCount
                            )}
                          </td>

                          <td className="px-6 py-4 font-bold">
                            {numberFormatter.format(
                              row.earnActions
                            )}
                          </td>

                          <td className="px-6 py-4 font-bold text-success">
                            {numberFormatter.format(
                              row.earnedAmount
                            )}
                          </td>

                          <td className="px-6 py-4 font-bold">
                            {numberFormatter.format(
                              row.redeemActions
                            )}
                          </td>

                          <td className="px-6 py-4 font-bold text-warning">
                            {numberFormatter.format(
                              row.redeemedAmount
                            )}
                          </td>

                          <td className="px-6 py-4 font-bold">
                            {numberFormatter.format(row.rewardRedemptions)}
                          </td>

                          <td className="px-6 py-4 font-bold">
                            {numberFormatter.format(
                              row.adjustmentActions
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex min-w-12 justify-center rounded-full bg-foreground px-4 py-1.5 font-black text-white">
                              {numberFormatter.format(
                                row.totalActions
                              )}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`${simple ? "hidden" : "lg:hidden"} mt-6 space-y-4`}>
              {rows.map(
                (row) => (
                  <article
                    key={row.id}
                    className="rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm"
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
                          className="mt-1 truncate text-right text-xs text-foreground-subtle"
                        >
                          {row.email}
                        </p>
                      </div>

                      <span className="rounded-full bg-foreground px-4 py-1.5 text-sm font-black text-white">
                        {numberFormatter.format(
                          row.totalActions
                        )}{" "}
                        {t("عملية", "operation")}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-4">
                        <p className="text-foreground-subtle">
                          {t("العملاء", "Customers")}
                        </p>

                        <p className="mt-1 font-black">
                          {numberFormatter.format(
                            row.customersCount
                          )}
                        </p>
                      </div>

                      <div className="rounded-[var(--lf-radius-input)] bg-warning-subtle p-4">
                        <p className="text-warning">{t("مكافآت مستبدلة", "Rewards redeemed")}</p>
                        <p className="mt-1 font-black text-warning">{numberFormatter.format(row.rewardRedemptions)}</p>
                      </div>

                      <div className="rounded-[var(--lf-radius-input)] bg-success-subtle p-4">
                        <p className="text-success">
                          {t("الرصيد المضاف", "Earned balance")}
                        </p>

                        <p className="mt-1 font-black text-success">
                          {numberFormatter.format(
                            row.earnedAmount
                          )}
                        </p>
                      </div>

                      <div className="rounded-[var(--lf-radius-input)] bg-warning-subtle p-4">
                        <p className="text-warning">
                          {t("الرصيد المستبدل", "Redeemed balance")}
                        </p>

                        <p className="mt-1 font-black text-warning">
                          {numberFormatter.format(
                            row.redeemedAmount
                          )}
                        </p>
                      </div>

                      <div className="rounded-[var(--lf-radius-input)] bg-primary-subtle p-4">
                        <p className="text-primary">
                          {t("التعديلات", "Adjustments")}
                        </p>

                        <p className="mt-1 font-black text-primary">
                          {numberFormatter.format(
                            row.adjustmentActions
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
