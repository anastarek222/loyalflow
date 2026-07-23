import { auth } from "@/auth";
import {
  formatUtcDateInput,
  parseUtcDateInput,
  parseReportDateRange,
} from "@/lib/analytics/date-range";
import {
  getReportQueryString,
  getRecordedSalesWhere,
  resolveReportScope,
} from "@/lib/analytics/report-filters";
import {
  calculateAverageDaysBetweenVisits,
  calculateAverageDaysToFirstReward,
  calculateRepeatCustomerRate,
  countDistinctCustomers,
} from "@/lib/analytics/metrics";
import {
  getCustomerFilterSegments,
  getCustomerSegmentLabel,
  getCustomerSegmentWhere,
  type CustomerSegment,
} from "@/lib/customers/segments";
import {
  canExportBusinessData,
  canPerform,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type ReportsPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    from?: string;
    to?: string;
    period?: string;
    segment?: string;
    loyaltyMode?: string;
    branch?: string;
    staff?: string;
  }>;
};

const dateTimeFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
});

const reportPeriods = ["today", "7d", "30d"] as const;

type ReportPeriod = (typeof reportPeriods)[number] | "custom";

function getReportRange(
  period: ReportPeriod,
  now: Date
) {
  const toInput = formatUtcDateInput(now);
  const from = new Date(now);

  if (period === "7d") {
    from.setUTCDate(from.getUTCDate() - 6);
  } else if (period === "30d") {
    from.setUTCDate(from.getUTCDate() - 29);
  }

  const fromInput = formatUtcDateInput(from);

  return {
    fromInput,
    toInput,
    from: parseUtcDateInput(fromInput)!,
    to: parseUtcDateInput(toInput, true)!,
  };
}

function getLoyaltyModeLabel(mode: string) {
  switch (mode) {
    case "VISITS":
      return "الزيارات";
    case "POINTS":
      return "النقاط";
    case "SALES_AMOUNT":
      return "المبيعات";
    default:
      return mode;
  }
}

function getCustomerName(customer: {
  firstName: string;
  lastName: string | null;
}) {
  return [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");
}

export default async function ReportsPage({
  params,
  searchParams,
}: ReportsPageProps) {
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
    select: {
      id: true,
      allowOwnerDataExport: true,
      name: true,
      slug: true,
      primaryColor: true,
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
      loyaltyMode: true,
      unitName: true,
      rewardName: true,
      rewardThreshold: true,
      earnAmount: true,
    },
  });

  if (!business) {
    notFound();
  }

  const theme =
    getBusinessTheme(business);

  const canViewReports = canPerform(
    session.user,
    business.id,
    "REPORTS_VIEW"
  );

  if (!canViewReports) {
    redirect(`/businesses/${business.slug}`);
  }

  const today = new Date();
  const requestedPeriod = reportPeriods.includes(
    query.period as (typeof reportPeriods)[number]
  )
    ? (query.period as (typeof reportPeriods)[number])
    : null;
  const defaultRange = getReportRange("30d", today);
  const shortcutRange = requestedPeriod
    ? getReportRange(requestedPeriod, today)
    : null;

  let period: ReportPeriod = requestedPeriod ?? "custom";
  const customRange = parseReportDateRange({
    from: query.from,
    to: query.to,
    now: today,
  });
  const selectedRange = shortcutRange ?? customRange ?? defaultRange;
  if (!shortcutRange && !customRange) period = "30d";
  const { fromInput, toInput, from: fromDate, to: toDate } = selectedRange;

  const availableSegments = getCustomerFilterSegments(
    business.loyaltyMode
  );
  const segment = availableSegments.includes(
    query.segment as CustomerSegment
  )
    ? (query.segment as CustomerSegment)
    : null;

  // A business has exactly one active loyalty programme in the current schema.
  // Keeping the selected mode in the report URL makes the filter explicit now
  // and keeps links forward-compatible if businesses later support programmes.
  const loyaltyMode =
    query.loyaltyMode === business.loyaltyMode
      ? business.loyaltyMode
      : "all";

  const [reportBranches, reportStaff] = await Promise.all([
    prisma.branch.findMany({
      where: { businessId: business.id },
      select: { id: true, businessId: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { businessId: business.id },
      select: { id: true, businessId: true, firstName: true, lastName: true, isActive: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);
  // Invalid/cross-tenant route values are ignored on the HTML report. The
  // export route rejects them; neither path can expand this tenant's scope.
  const reportScope = resolveReportScope({
    businessId: business.id,
    branchId: query.branch,
    staffId: query.staff,
    branches: reportBranches,
    staff: reportStaff,
  }) ?? {};
  const operationScope = reportScope;
  const activityScope = reportScope.branchId
    ? { branchId: reportScope.branchId }
    : {};

  const customerWhere: Prisma.CustomerWhereInput = {
    businessId: business.id,
    ...(segment
      ? getCustomerSegmentWhere(
          segment,
          business.rewardThreshold,
          undefined,
          business.earnAmount
        )
      : {}),
  };

  const transactionWhere: Prisma.LoyaltyTransactionWhereInput = {
    businessId: business.id,
    createdAt: {
      gte: fromDate,
      lte: toDate,
    },
    ...operationScope,
    ...(segment
      ? {
          customer: customerWhere,
        }
      : {}),
  };

  const redemptionWhere: Prisma.RewardRedemptionWhereInput = {
    businessId: business.id,
    createdAt: {
      gte: fromDate,
      lte: toDate,
    },
    ...operationScope,
    ...(segment
      ? {
          customer: customerWhere,
        }
      : {}),
  };

  const [
    newCustomers,
    totalCustomers,
    inactiveCustomers,
    atRiskCustomers,
    earned,
    allTimeEarned,
    trackedSales,
    allTimeTrackedSales,
    redeemed,
    allTimeRedeemed,
    rewardUnlocks,
    rewardDistribution,
    recoveredCustomerGroups,
    transactionCount,
    activeCustomerGroups,
    returningCustomerGroups,
    visitEvents,
    allTimeVisitCount,
    currentBalances,
    recentTransactions,
    topCustomers,
    mostActiveGroups,
    highestValueEarnedGroups,
    mostRedeemedGroups,
    firstRewardGroups,
  ] = await Promise.all([
    prisma.customer.count({
      where: {
        ...customerWhere,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
    }),

    prisma.customer.count({
      where: {
        ...customerWhere,
      },
    }),

    prisma.customer.count({
      where: {
        AND: [
          customerWhere,
          getCustomerSegmentWhere(
            "INACTIVE",
            business.rewardThreshold
          ),
        ],
      },
    }),

    prisma.customer.count({
      where: {
        AND: [
          customerWhere,
          getCustomerSegmentWhere(
            "AT_RISK",
            business.rewardThreshold
          ),
        ],
      },
    }),

    prisma.loyaltyTransaction.aggregate({
      where: {
        ...transactionWhere,
        type: "EARN",
      },
      _sum: {
        amount: true,
      },
      _avg: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.loyaltyTransaction.aggregate({
      where: {
        businessId: business.id,
        type: "EARN",
        ...operationScope,
        ...(segment
          ? {
              customer: customerWhere,
            }
          : {}),
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.loyaltyTransaction.aggregate({
      where: {
        ...transactionWhere,
        ...getRecordedSalesWhere(),
      },
      _sum: {
        saleAmount: true,
      },
      _avg: {
        saleAmount: true,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.loyaltyTransaction.aggregate({
      where: {
        businessId: business.id,
        ...operationScope,
        ...getRecordedSalesWhere(),
        ...(segment
          ? {
              customer: customerWhere,
            }
          : {}),
      },
      _sum: {
        saleAmount: true,
      },
    }),

    prisma.rewardRedemption.aggregate({
      where: redemptionWhere,
      _sum: {
        cost: true,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.rewardRedemption.aggregate({
      where: {
        businessId: business.id,
        ...operationScope,
        ...(segment
          ? {
              customer: customerWhere,
            }
          : {}),
      },
      _count: {
        _all: true,
      },
    }),

    // Reward unlocks have no branch or staff provenance in the current
    // schema, so this remains an explicitly business-wide customer metric.
    prisma.rewardUnlock.count({
      where: {
        businessId: business.id,
        unlockedAt: {
          gte: fromDate,
          lte: toDate,
        },
        ...(segment ? { customer: customerWhere } : {}),
      },
    }),

    prisma.rewardRedemption.groupBy({
      by: ["rewardName"],
      where: redemptionWhere,
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          rewardName: "desc",
        },
      },
      take: 5,
    }),

    prisma.businessActivity.groupBy({
      by: ["customerId"],
      where: {
        businessId: business.id,
        type: "CUSTOMER_REACTIVATED",
        ...activityScope,
        customerId: {
          not: null,
        },
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        ...(segment
          ? {
              customer: customerWhere,
            }
          : {}),
      },
    }),

    prisma.loyaltyTransaction.count({
      where: transactionWhere,
    }),

    prisma.loyaltyTransaction.groupBy({
      by: ["customerId"],
      where: transactionWhere,
    }),

    prisma.loyaltyTransaction.groupBy({
      by: ["customerId"],
      where: {
        ...transactionWhere,
        type: "EARN",
      },
      _count: {
        _all: true,
      },
    }),

    prisma.loyaltyTransaction.findMany({
      where: {
        ...transactionWhere,
        type: "EARN",
        sourceLoyaltyMode: "VISITS",
      },
      select: {
        customerId: true,
        createdAt: true,
      },
    }),

    prisma.loyaltyTransaction.count({
      where: {
        businessId: business.id,
        type: "EARN",
        sourceLoyaltyMode: "VISITS",
        ...operationScope,
        ...(segment
          ? {
              customer: customerWhere,
            }
          : {}),
      },
    }),

    prisma.customer.aggregate({
      where: {
        ...customerWhere,
        isActive: true,
      },
      _sum: {
        balance: true,
      },
    }),

    prisma.loyaltyTransaction.findMany({
      where: transactionWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customerCode: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),

    prisma.customer.findMany({
      where: {
        ...customerWhere,
      },
      orderBy: [
        {
          lifetimeEarned: "desc",
        },
        {
          createdAt: "asc",
        },
      ],
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        customerCode: true,
        balance: true,
        lifetimeEarned: true,
        lifetimeRedeemed: true,
      },
    }),

    prisma.loyaltyTransaction.groupBy({
      by: ["customerId"],
      where: transactionWhere,
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          customerId: "desc",
        },
      },
      take: 5,
    }),

    prisma.loyaltyTransaction.groupBy({
      by: ["customerId"],
      where: {
        ...transactionWhere,
        type: "EARN",
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
      take: 5,
    }),

    prisma.rewardRedemption.groupBy({
      by: ["customerId"],
      where: redemptionWhere,
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          customerId: "desc",
        },
      },
      take: 5,
    }),

    prisma.rewardRedemption.groupBy({
      by: ["customerId"],
      where: {
        businessId: business.id,
        ...operationScope,
        ...(segment
          ? {
              customer: customerWhere,
            }
          : {}),
      },
      _min: {
        createdAt: true,
      },
    }),
  ]);

  const earnedAmount = earned._sum.amount ?? 0;

  const lifetimeEarnedAmount = allTimeEarned._sum.amount ?? 0;

  const trackedSalesAmount = trackedSales._sum.saleAmount ?? 0;

  const lifetimeTrackedSalesAmount =
    allTimeTrackedSales._sum.saleAmount ?? 0;

  const recoveredCustomers = countDistinctCustomers(
    recoveredCustomerGroups
  );

  const redeemedCost = redeemed._sum.cost ?? 0;

  const currentBalance = currentBalances._sum.balance ?? 0;

  const firstRewardCustomers =
    firstRewardGroups.length > 0
      ? await prisma.customer.findMany({
          where: {
            id: {
              in: firstRewardGroups.map(
                (reward) => reward.customerId
              ),
            },
            businessId: business.id,
          },
          select: {
            id: true,
            createdAt: true,
          },
        })
      : [];

  const averageDaysToFirstReward =
    calculateAverageDaysToFirstReward(
      firstRewardCustomers,
      firstRewardGroups.map((reward) => ({
        customerId: reward.customerId,
        firstRewardAt: reward._min.createdAt,
      }))
    );

  const rankingCustomerIds = Array.from(
    new Set(
      [
        ...mostActiveGroups,
        ...highestValueEarnedGroups,
        ...mostRedeemedGroups,
      ].map((group) => group.customerId)
    )
  );

  const rankingCustomers =
    rankingCustomerIds.length > 0
      ? await prisma.customer.findMany({
          where: {
            businessId: business.id,
            id: {
              in: rankingCustomerIds,
            },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customerCode: true,
          },
        })
      : [];

  const rankingCustomersById = new Map(
    rankingCustomers.map((customer) => [customer.id, customer])
  );

  const mostActiveCustomers = mostActiveGroups.flatMap((group) => {
    const customer = rankingCustomersById.get(group.customerId);

    return customer
      ? [{ customer, value: group._count._all }]
      : [];
  });

  const highestValueEarnedCustomers =
    highestValueEarnedGroups.flatMap((group) => {
      const customer = rankingCustomersById.get(group.customerId);

      return customer
        ? [{ customer, value: group._sum.amount ?? 0 }]
        : [];
    });

  const mostRedeemedCustomers = mostRedeemedGroups.flatMap((group) => {
    const customer = rankingCustomersById.get(group.customerId);

    return customer
      ? [{ customer, value: group._count._all }]
      : [];
  });

  const returningCustomers =
    returningCustomerGroups.filter(
      (customer) => customer._count._all >= 2
    ).length;

  const repeatCustomerRate = calculateRepeatCustomerRate(
    returningCustomers,
    returningCustomerGroups.length
  );

  const averageDaysBetweenVisits =
    business.loyaltyMode === "VISITS"
      ? calculateAverageDaysBetweenVisits(visitEvents)
      : null;

  const averageLoyaltyActivity =
    activeCustomerGroups.length > 0
      ? earned._count._all /
        activeCustomerGroups.length
      : 0;

  const redemptionRate =
    earned._count._all > 0
      ? (redeemed._count._all /
          earned._count._all) *
        100
      : 0;

  const averagePurchaseAmount =
    trackedSales._avg.saleAmount ?? 0;

  const canExportData = canExportBusinessData(
    session.user,
    business.id,
    business.allowOwnerDataExport
  );

  const reportQuery = getReportQueryString({
    from: fromInput,
    to: toInput,
    segment,
    loyaltyMode,
    branchId: reportScope.branchId,
    attributedStaffId: reportScope.attributedStaffId,
  });

  const activeReportFilters = new URLSearchParams({
    ...(segment ? { segment } : {}),
    ...(loyaltyMode !== "all" ? { loyaltyMode } : {}),
    ...(reportScope.branchId ? { branch: reportScope.branchId } : {}),
    ...(reportScope.attributedStaffId ? { staff: reportScope.attributedStaffId } : {}),
  }).toString();

  const reportFilterSuffix = activeReportFilters
    ? `&${activeReportFilters}`
    : "";

  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-8 sm:py-8"
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/businesses/${business.slug}`}
          className="text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          → الرجوع إلى {business.name}
        </Link>

        <header
          className={`mt-5 border p-5 text-white sm:p-8 ${theme.cardClass} ${theme.borderClass}`}
          style={{
            backgroundColor: theme.primaryColor,
          }}
        >
          <p className="text-sm text-white/70">تقارير النشاط</p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            {business.name}
          </h1>

          <p className="mt-2 text-sm text-white/70">
            متابعة العملاء وحركات الولاء والمكافآت.
          </p>
        </header>


        <section
          className="mt-6 grid gap-3 sm:grid-cols-2"
        >
          <Link
            href={`/businesses/${business.slug}/reports/staff?${reportQuery}`}
            className={`${theme.buttonClass} p-5 text-center font-black text-white shadow-sm transition`}
            style={{
              backgroundColor: theme.primaryColor,
            }}
          >
            👥 تقرير أداء الموظفين
          </Link>

          {canExportData && (
            <a
            href={`/businesses/${business.slug}/reports/export?${reportQuery}`}
            className="rounded-2xl bg-emerald-600 p-5 text-center font-black text-white shadow-sm transition hover:bg-emerald-700"
          >
            📥 تصدير حركات الفترة CSV
          </a>
          )}
        </section>

        <form
          method="get"
          className={`mt-6 grid gap-4 border bg-white p-4 sm:mt-8 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] xl:items-end sm:p-6 ${theme.cardClass} ${theme.borderClass}`}
        >
          <input name="period" type="hidden" value="custom" />
          <div>
            <label
              htmlFor="from"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              من تاريخ
            </label>

            <input
              id="from"
              name="from"
              type="date"
              defaultValue={fromInput}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label
              htmlFor="segment"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              شريحة العملاء
            </label>

            <select
              id="segment"
              name="segment"
              defaultValue={segment ?? "all"}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-500"
            >
              <option value="all">كل الشرائح</option>
              {availableSegments.map((customerSegment) => (
                <option
                  key={customerSegment}
                  value={customerSegment}
                >
                  {getCustomerSegmentLabel(customerSegment)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="loyaltyMode"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              برنامج الولاء
            </label>

            <select
              id="loyaltyMode"
              name="loyaltyMode"
              defaultValue={loyaltyMode}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-500"
            >
              <option value="all">كل البرامج المتاحة</option>
              <option value={business.loyaltyMode}>
                {getLoyaltyModeLabel(business.loyaltyMode)}
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              إلى تاريخ
            </label>

            <input
              id="to"
              name="to"
              type="date"
              defaultValue={toInput}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label
              htmlFor="branch"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              الفرع
            </label>

            <select
              id="branch"
              name="branch"
              defaultValue={reportScope.branchId ?? "all"}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-500"
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
            <label
              htmlFor="staff"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              الموظف المنسوب إليه
            </label>

            <select
              id="staff"
              name="staff"
              defaultValue={reportScope.attributedStaffId ?? "all"}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-500"
            >
              <option value="all">كل الموظفين والعمليات غير المنسوبة</option>
              {reportStaff.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {[staffMember.firstName, staffMember.lastName]
                    .filter(Boolean)
                    .join(" ") || "مستخدم بدون اسم"}
                  {staffMember.isActive ? "" : " (غير نشط)"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-700 sm:w-auto"
          >
            تطبيق الفلتر
          </button>

          <div className="flex flex-wrap gap-2 xl:col-span-2">
            {[
              ["today", "اليوم"],
              ["7d", "آخر 7 أيام"],
              ["30d", "آخر 30 يومًا"],
            ].map(([shortcut, label]) => (
              <Link
                key={shortcut}
                href={`/businesses/${business.slug}/reports?period=${shortcut}${reportFilterSuffix}`}
                className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold transition ${
                  period === shortcut
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-violet-400"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </form>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">إجمالي العملاء</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {totalCustomers}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {segment
                ? `ضمن شريحة ${getCustomerSegmentLabel(segment)}`
                : "كل العملاء المسجلين"}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">العملاء الجدد</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {newCustomers}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              تم تسجيلهم خلال الفترة المحددة
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">العملاء النشطون</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {activeCustomerGroups.length}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              عملاء لديهم حركات ولاء
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">العملاء غير النشطين</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {inactiveCustomers}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              حسب قاعدة عدم النشاط الحالية
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">عملاء معرّضون للتوقف</p>

            <p className="mt-3 text-4xl font-bold text-rose-600">
              {atRiskCustomers}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              توقف نشاطهم مؤخرًا ويحتاجون متابعة
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">الحركات</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {transactionCount}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              عمليات الإضافة والاستبدال
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">رصيد الولاء المكتسب</p>

            <p className="mt-3 text-4xl font-bold text-emerald-600">
              {earnedAmount}
            </p>

            <p dir="auto" className="mt-2 text-xs text-slate-400">
              {earned._count._all} عملية إضافة — {business.unitName}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">إجمالي الولاء المكتسب</p>

            <p className="mt-3 text-4xl font-bold text-emerald-700">
              {lifetimeEarnedAmount}
            </p>

            <p dir="auto" className="mt-2 text-xs text-slate-400">
              {allTimeEarned._count._all} عملية إضافة منذ بداية البرنامج
            </p>
          </article>

          {business.loyaltyMode === "SALES_AMOUNT" && (
            <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm text-slate-500">إجمالي الإنفاق المسجل</p>

              <p className="mt-3 text-4xl font-bold text-emerald-700">
                {lifetimeTrackedSalesAmount}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                محسوب فقط من عمليات البيع المسجلة في LoyalFlow
              </p>
            </article>
          )}

          {business.loyaltyMode === "VISITS" && (
            <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm text-slate-500">إجمالي الزيارات</p>

              <p className="mt-3 text-4xl font-bold text-slate-950">
                {allTimeVisitCount}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                كل عمليات الإضافة المسجلة كزيارة
              </p>
            </article>
          )}

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">متوسط الوقت لأول مكافأة</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {averageDaysToFirstReward === null
                ? "—"
                : `${averageDaysToFirstReward.toFixed(1)} يوم`}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              من إنشاء العميل حتى أول استبدال
            </p>
          </article>

          {business.loyaltyMode === "SALES_AMOUNT" && (
            <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm text-slate-500">متوسط قيمة الشراء</p>

              <p className="mt-3 text-4xl font-bold text-slate-950">
                {averagePurchaseAmount.toFixed(1)}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                متوسط عمليات الشراء المؤهلة خلال الفترة
              </p>
            </article>
          )}

          {business.loyaltyMode === "VISITS" && (
            <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm text-slate-500">متوسط الأيام بين الزيارات</p>

              <p className="mt-3 text-4xl font-bold text-slate-950">
                {averageDaysBetweenVisits === null
                  ? "—"
                  : `${averageDaysBetweenVisits.toFixed(1)} يوم`}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                بين الزيارات المسجلة خلال الفترة المحددة
              </p>
            </article>
          )}

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">المكافآت المستبدلة</p>

            <p className="mt-3 text-4xl font-bold text-amber-600">
              {redeemed._count._all}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              إجمالي التكلفة خلال الفترة: {redeemedCost} — الإجمالي منذ البداية: {allTimeRedeemed._count._all}
            </p>

            {rewardDistribution.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-slate-500">
                {rewardDistribution.map((reward) => (
                  <li key={reward.rewardName}>
                    {reward.rewardName}: {reward._count._all}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">مكافآت فُتحت</p>

            <p className="mt-3 text-4xl font-bold text-violet-600">
              {rewardUnlocks}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              مقياس على مستوى النشاط؛ لا يحمل فتح المكافأة فرعًا أو موظفًا في السجل الحالي.
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">أرصدة العملاء الحالية</p>

            <p className="mt-3 text-4xl font-bold text-violet-600">
              {currentBalance}
            </p>

            <p dir="auto" className="mt-2 text-xs text-slate-400">
              إجمالي {business.unitName} المتاحة
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">العملاء العائدون</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {returningCustomers}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              عميل لديه عمليتا إضافة أو أكثر خلال الفترة
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">معدل تكرار العملاء</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {repeatCustomerRate.toFixed(1)}%
            </p>

            <p className="mt-2 text-xs text-slate-400">
              العملاء ذوو عمليتي إضافة أو أكثر من العملاء النشطين بالولاء
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">العملاء المستعادون</p>

            <p className="mt-3 text-4xl font-bold text-emerald-600">
              {recoveredCustomers}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              حسابات أعيد تفعيلها خلال الفترة
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">متوسط نشاط الولاء</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {averageLoyaltyActivity.toFixed(1)}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              عمليات إضافة لكل عميل نشط
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">معدل استبدال المكافآت</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {redemptionRate.toFixed(1)}%
            </p>

            <p className="mt-2 text-xs text-slate-400">
              نسبة الاستبدالات إلى عمليات الإضافة
            </p>
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black text-emerald-300">أثر برنامج الولاء</p>
              <h2 className="mt-1 text-2xl font-black">مؤشرات تشغيلية موثقة</h2>
            </div>

            <p className="max-w-xl text-sm leading-6 text-slate-300">
              تعرض هذه المؤشرات ما سجله LoyalFlow فقط. لا تنسب إيرادًا أو عائدًا للبرنامج ما لم يكن مسجلاً صراحةً كعملية بيع.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: "عملاء عائدون",
                value: returningCustomers,
                detail: "عمليتا إضافة أو أكثر خلال الفترة",
              },
              {
                label: "عملاء مستعادون",
                value: recoveredCustomers,
                detail: "حسابات أعيد تفعيلها خلال الفترة",
              },
              {
                label: "حركات ولاء مسجلة",
                value: transactionCount,
                detail: "إضافة، استبدال، أو تعديل ضمن الفترة",
              },
              {
                label: "مكافآت مستبدلة",
                value: redeemed._count._all,
                detail: "استبدالات مسجلة خلال الفترة",
              },
              {
                label: "معدل تكرار العملاء",
                value: `${repeatCustomerRate.toFixed(1)}%`,
                detail: "من العملاء ذوي نشاط الولاء",
              },
              ...(business.loyaltyMode === "SALES_AMOUNT"
                ? [
                    {
                      label: "مبيعات ولاء مسجلة",
                      value: trackedSalesAmount,
                      detail: "مبيعات أدخلها الموظفون خلال الفترة، وليست إسنادًا تسويقيًا",
                    },
                  ]
                : []),
            ].map((metric) => (
              <article key={metric.label} className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">{metric.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{metric.value}</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">{metric.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            {
              title: "الأكثر نشاطًا",
              description: "حسب كل حركات الولاء خلال الفترة.",
              items: mostActiveCustomers,
              suffix: "حركة",
            },
            {
              title: "أعلى قيمة مكتسبة",
              description: "حسب الرصيد المكتسب خلال الفترة.",
              items: highestValueEarnedCustomers,
              suffix: business.unitName,
            },
            {
              title: "الأكثر استبدالًا",
              description: "حسب المكافآت المستبدلة خلال الفترة.",
              items: mostRedeemedCustomers,
              suffix: "مكافأة",
            },
          ].map((ranking) => (
            <article
              key={ranking.title}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-950">
                {ranking.title}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {ranking.description}
              </p>

              <div className="mt-5 space-y-3">
                {ranking.items.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    لا توجد بيانات خلال هذه الفترة.
                  </p>
                ) : (
                  ranking.items.map(({ customer, value }, index) => (
                    <Link
                      key={customer.id}
                      href={`/businesses/${business.slug}/customers/${customer.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-violet-300 hover:bg-violet-50"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                        {index + 1}
                      </span>

                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-950">
                        {getCustomerName(customer)}
                      </span>

                      <span className="text-sm font-bold text-violet-700">
                        {value} {ranking.suffix}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
              <h2 className="text-xl font-bold text-slate-950">أحدث الحركات</h2>

              <p className="mt-1 text-sm text-slate-500">
                أحدث 50 عملية خلال الفترة المحددة.
              </p>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                لا توجد حركات خلال هذه الفترة.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4">العميل</th>

                      <th className="px-6 py-4">النوع</th>

                      <th className="px-6 py-4">القيمة</th>

                      <th className="px-6 py-4">الرصيد</th>

                      <th className="px-6 py-4">الموظف</th>

                      <th className="px-6 py-4">التاريخ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.map((transaction) => {
                      const customerName = [
                        transaction.customer.firstName,
                        transaction.customer.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ");

                      const employeeName = transaction.createdBy
                        ? [
                            transaction.createdBy.firstName,
                            transaction.createdBy.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ")
                        : "النظام";

                      return (
                        <tr key={transaction.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <Link
                              href={`/businesses/${business.slug}/customers/${transaction.customer.id}`}
                              className="font-semibold text-slate-950 hover:text-violet-700"
                            >
                              {customerName}
                            </Link>

                            <p className="mt-1 text-xs text-slate-400">
                              {transaction.customer.customerCode}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={
                                transaction.type === "EARN"
                                  ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                                  : transaction.type === "REDEEM"
                                    ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                                    : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                              }
                            >
                              {transaction.type === "EARN"
                                ? "إضافة رصيد"
                                : transaction.type === "REDEEM"
                                  ? "استبدال مكافأة"
                                  : "تعديل رصيد"}
                            </span>
                          </td>

                          <td
                            className={`px-6 py-4 font-bold ${
                              transaction.amount >= 0
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {transaction.amount > 0 ? "+" : ""}
                            {transaction.amount}
                          </td>

                          <td className="px-6 py-4 font-semibold text-slate-700">
                            {transaction.balanceAfter}
                          </td>

                          <td className="px-6 py-4 text-slate-600">
                            {employeeName}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                            {dateTimeFormatter.format(transaction.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">أفضل العملاء</h2>

            <p className="mt-1 text-sm text-slate-500">
              الترتيب حسب إجمالي رصيد الولاء المكتسب.
            </p>

            <div className="mt-6 space-y-4">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  لا يوجد عملاء حتى الآن.
                </p>
              ) : (
                topCustomers.map((customer, index) => {
                  const customerName = [customer.firstName, customer.lastName]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <Link
                      key={customer.id}
                      href={`/businesses/${business.slug}/customers/${customer.id}`}
                      className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-violet-300 hover:bg-violet-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-950">
                          {customerName}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {customer.customerCode}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-violet-700">
                          {customer.lifetimeEarned}
                        </p>

                        <p className="text-xs text-slate-400">
                          الرصيد {customer.balance}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
