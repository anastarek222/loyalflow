import { auth } from "@/auth";
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
import Link from "next/link";

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

function roleLabel(
  role: string
) {
  switch (role) {
    case "OWNER":
      return "مالك";

    case "MANAGER":
      return "مدير";

    case "STAFF":
      return "موظف / كاشير";

    case "VIEWER":
      return "مشاهد";

    case "SUPER_ADMIN":
      return "مدير النظام";

    default:
      return role;
  }
}

const numberFormatter =
  new Intl.NumberFormat(
    "ar-EG"
  );

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

  const theme =
    getBusinessTheme(business);

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
  const transactions = await prisma.loyaltyTransaction.findMany({
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
  });

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
            "النظام أو مستخدم محذوف",
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
      dir="rtl"
      className="min-h-screen px-4 py-5 sm:px-8 sm:py-8"
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/businesses/${business.slug}/reports?${reportQuery}`}
          className="text-sm font-bold text-violet-700 hover:text-violet-900"
        >
          العودة إلى التقارير ←
        </Link>

        <header
          className={`mt-5 border p-5 text-white sm:p-8 ${theme.cardClass} ${theme.borderClass}`}
          style={{
            backgroundColor:
              theme.primaryColor,
          }}
        >
          <p className="text-sm font-bold text-white/70">
            تحليل العمليات المنفذة
          </p>

          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            أداء فريق العمل
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/75">
            مقارنة عمليات إضافة الرصيد والاستبدال والتعديلات لكل مستخدم.
          </p>
        </header>

        <form
          method="get"
          className={`mt-6 grid gap-4 border bg-white p-5 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end sm:p-6 ${theme.cardClass} ${theme.borderClass}`}
        >
          <div>
            <label
              htmlFor="from"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              من تاريخ
            </label>

            <input
              id="from"
              name="from"
              type="date"
              defaultValue={
                fromInput
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label htmlFor="branch" className="mb-2 block text-sm font-bold text-slate-700">
              الفرع
            </label>
            <select
              id="branch"
              name="branch"
              defaultValue={reportScope.branchId ?? "all"}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
            >
              <option value="all">كل الفروع والسجل التاريخي</option>
              {reportBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}{branch.isActive ? "" : " (غير نشط)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="staff" className="mb-2 block text-sm font-bold text-slate-700">
              الموظف المنسوب إليه
            </label>
            <select
              id="staff"
              name="staff"
              defaultValue={reportScope.attributedStaffId ?? "all"}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
            >
              <option value="all">كل الموظفين والعمليات غير المنسوبة</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || "مستخدم بدون اسم"}
                  {user.isActive ? "" : " (غير نشط)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              إلى تاريخ
            </label>

            <input
              id="to"
              name="to"
              type="date"
              defaultValue={
                toInput
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white transition hover:bg-violet-700"
          >
            تطبيق الفترة
          </button>

          <Link
            href={`/businesses/${business.slug}/reports/staff`}
            className="rounded-xl border border-slate-300 px-6 py-3 text-center font-bold text-slate-700"
          >
            آخر 30 يومًا
          </Link>
        </form>

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              المستخدمون النشطون
            </p>

            <p className="mt-3 text-3xl font-black text-slate-950">
              {numberFormatter.format(
                activeUsers
              )}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              إجمالي العمليات
            </p>

            <p className="mt-3 text-3xl font-black text-slate-950">
              {numberFormatter.format(
                totalActions
              )}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              الرصيد المضاف
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-700">
              {numberFormatter.format(
                totalEarned
              )}
            </p>

            <p
              dir="auto"
              className="mt-1 text-xs text-slate-500"
            >
              {business.unitName}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              الرصيد المستبدل
            </p>

            <p className="mt-3 text-3xl font-black text-amber-700">
              {numberFormatter.format(
                totalRedeemed
              )}
            </p>

            <p
              dir="auto"
              className="mt-1 text-xs text-slate-500"
            >
              {business.unitName}
            </p>
          </article>
        </section>

        {rows.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-black text-slate-950">
              لا يوجد مستخدمون
            </h2>
          </section>
        ) : (
          <>
            <section className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-950 text-sm text-white">
                    <tr>
                      <th className="px-5 py-4">
                        المستخدم
                      </th>

                      <th className="px-5 py-4">
                        العملاء
                      </th>

                      <th className="px-5 py-4">
                        إضافات
                      </th>

                      <th className="px-5 py-4">
                        القيمة المضافة
                      </th>

                      <th className="px-5 py-4">
                        استبدالات
                      </th>

                      <th className="px-5 py-4">
                        القيمة المستبدلة
                      </th>

                      <th className="px-5 py-4">
                        تعديلات
                      </th>

                      <th className="px-5 py-4">
                        الإجمالي
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map(
                      (row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p
                              dir="auto"
                              className="font-black text-slate-950"
                            >
                              {row.name}
                            </p>

                            <p
                              dir="ltr"
                              className="mt-1 text-right text-xs text-slate-500"
                            >
                              {row.email}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                                {roleLabel(
                                  row.role
                                )}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  row.isActive
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {row.isActive
                                  ? "نشط"
                                  : "غير نشط"}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-bold">
                            {numberFormatter.format(
                              row.customersCount
                            )}
                          </td>

                          <td className="px-5 py-4 font-bold">
                            {numberFormatter.format(
                              row.earnActions
                            )}
                          </td>

                          <td className="px-5 py-4 font-bold text-emerald-700">
                            {numberFormatter.format(
                              row.earnedAmount
                            )}
                          </td>

                          <td className="px-5 py-4 font-bold">
                            {numberFormatter.format(
                              row.redeemActions
                            )}
                          </td>

                          <td className="px-5 py-4 font-bold text-amber-700">
                            {numberFormatter.format(
                              row.redeemedAmount
                            )}
                          </td>

                          <td className="px-5 py-4 font-bold">
                            {numberFormatter.format(
                              row.adjustmentActions
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex min-w-12 justify-center rounded-full bg-slate-950 px-3 py-1.5 font-black text-white">
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

            <section className="mt-6 space-y-4 lg:hidden">
              {rows.map(
                (row) => (
                  <article
                    key={row.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2
                          dir="auto"
                          className="truncate text-lg font-black text-slate-950"
                        >
                          {row.name}
                        </h2>

                        <p
                          dir="ltr"
                          className="mt-1 truncate text-right text-xs text-slate-500"
                        >
                          {row.email}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-black text-white">
                        {numberFormatter.format(
                          row.totalActions
                        )}{" "}
                        عملية
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-slate-500">
                          العملاء
                        </p>

                        <p className="mt-1 font-black">
                          {numberFormatter.format(
                            row.customersCount
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50 p-3">
                        <p className="text-emerald-700">
                          الرصيد المضاف
                        </p>

                        <p className="mt-1 font-black text-emerald-900">
                          {numberFormatter.format(
                            row.earnedAmount
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-amber-50 p-3">
                        <p className="text-amber-700">
                          الرصيد المستبدل
                        </p>

                        <p className="mt-1 font-black text-amber-900">
                          {numberFormatter.format(
                            row.redeemedAmount
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-violet-50 p-3">
                        <p className="text-violet-700">
                          التعديلات
                        </p>

                        <p className="mt-1 font-black text-violet-900">
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
