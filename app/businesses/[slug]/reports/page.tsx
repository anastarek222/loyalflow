import { auth } from "@/auth";
import { ReportCharts } from "@/components/reports/report-charts";
import { ReportNavigation } from "@/components/reports/report-navigation";
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
import { createHistoricalAnalyticsTrends } from "@/lib/analytics/trends";
import { getExperienceModeCookieName, resolveExperienceMode } from "@/lib/experience-mode";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { reportCopy } from "@/lib/reports/presentation";
import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { cookies } from "next/headers";
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

function getLoyaltyModeLabel(mode: string, language: "AR" | "EN") {
  const labels: Record<string, { AR: string; EN: string }> = {
    VISITS: { AR: "الزيارات", EN: "Visits" },
    POINTS: { AR: "النقاط", EN: "Points" },
    SALES_AMOUNT: { AR: "المبيعات", EN: "Sales" },
  };
  return labels[mode]?.[language] ?? mode;
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
      currency: true,
      unitName: true,
      rewardName: true,
      rewardThreshold: true,
      earnAmount: true,
    },
  });

  if (!business) {
    notFound();
  }

  const reportUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, language: true, role: true, experienceAccess: true },
  });
  const language = normalizeLanguage(reportUser?.language);
  const t = (ar: string, en: string) => language === "AR" ? ar : en;
  const experienceMode = resolveExperienceMode(
    (await cookies()).get(getExperienceModeCookieName(session.user.id))?.value,
    reportUser?.role ?? session.user.role,
    reportUser?.experienceAccess,
  );
  const simple = experienceMode === "SIMPLE";
  const copy = reportCopy(language);
  const numberFormatter = new Intl.NumberFormat(getLanguageLocale(language));

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

  // The chart receives only server-derived daily buckets. It intentionally does
  // not reimplement analytics mathematics in a client component.
  const [historicalCustomers, historicalEarned, historicalRedemptions] = await Promise.all([
    prisma.customer.findMany({ where: { ...customerWhere, createdAt: { gte: fromDate, lte: toDate } }, select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.loyaltyTransaction.findMany({ where: { ...transactionWhere, type: "EARN" }, select: { createdAt: true, amount: true } }),
    prisma.rewardRedemption.findMany({ where: redemptionWhere, select: { createdAt: true } }),
  ]);
  const historicalTrends = createHistoricalAnalyticsTrends({
    customers: historicalCustomers,
    loyaltyEarned: historicalEarned,
    rewardsRedeemed: historicalRedemptions,
  }, fromDate, toDate);

  return (
    <main
      className="min-h-screen px-4 py-6 sm:px-8 sm:py-8"
    >
      <div className="mx-auto max-w-7xl" data-experience-mode={experienceMode}>
        <Link
          href={`/businesses/${business.slug}`}
          className="text-sm font-medium text-primary hover:text-primary"
        >
          {t("→ الرجوع إلى", "← Back to")} {business.name}
        </Link>

        <header
          className={`mt-6 border p-6 text-white sm:p-8 rounded-[var(--lf-radius-card)] border-border`}
        >
          <p className="text-sm text-white/70">{copy.overview}</p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            {business.name}
          </h1>

          <p className="mt-2 text-sm text-white/70">
            {simple ? copy.simple : copy.advanced}
          </p>
        </header>

        <ReportNavigation slug={business.slug} active="overview" query={reportQuery} language={language} />


        <section
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <Link
            href={`/businesses/${business.slug}/reports/staff?${reportQuery}`}
            className={`rounded-[var(--lf-radius-input)] bg-primary text-[var(--lf-primary-foreground)] hover:bg-primary-hover p-6 text-center font-black text-white shadow-sm transition`}
          >
            {t("👥 تقرير أداء الموظفين", "👥 Staff performance report")}
          </Link>

          {canExportData && (
            <a
            href={`/businesses/${business.slug}/reports/export?${reportQuery}`}
            className="rounded-[var(--lf-radius-card)] bg-success p-6 text-center font-black text-[var(--lf-inverse)] shadow-sm transition hover:bg-success-subtle"
          >
            {t("📥 تصدير حركات الفترة CSV", "📥 Export period transactions CSV")}
            </a>
          )}
          {!canExportData && (
            <p role="status" className="rounded-[var(--lf-radius-card)] border border-border bg-surface-subtle p-6 text-center text-sm font-semibold text-foreground-muted">
              {copy.exportUnavailable}
            </p>
          )}
        </section>

        <form
          method="get"
          className={`mt-6 grid gap-4 border bg-white p-4 sm:mt-8 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] xl:items-end sm:p-6 rounded-[var(--lf-radius-card)] border-border`}
        >
          <input name="period" type="hidden" value="custom" />
          <div>
            <label
              htmlFor="from"
              className="mb-2 block text-sm font-medium text-foreground-muted"
            >
              {t("من تاريخ", "From date")}
            </label>

            <input
              id="from"
              name="from"
              type="date"
              defaultValue={fromInput}
              className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground outline-none focus:border-primary/30"
            />
          </div>

          <div>
            <label
              htmlFor="segment"
              className="mb-2 block text-sm font-medium text-foreground-muted"
            >
              {t("شريحة العملاء", "Customer segment")}
            </label>

            <select
              id="segment"
              name="segment"
              defaultValue={segment ?? "all"}
              className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground outline-none focus:border-primary/30"
            >
              <option value="all">{t("كل الشرائح", "All segments")}</option>
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
              className="mb-2 block text-sm font-medium text-foreground-muted"
            >
              {t("برنامج الولاء", "Loyalty programme")}
            </label>

            <select
              id="loyaltyMode"
              name="loyaltyMode"
              defaultValue={loyaltyMode}
              className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground outline-none focus:border-primary/30"
            >
              <option value="all">{t("كل البرامج المتاحة", "All available programmes")}</option>
              <option value={business.loyaltyMode}>
                {getLoyaltyModeLabel(business.loyaltyMode, language)}
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-2 block text-sm font-medium text-foreground-muted"
            >
              {t("إلى تاريخ", "To date")}
            </label>

            <input
              id="to"
              name="to"
              type="date"
              defaultValue={toInput}
              className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground outline-none focus:border-primary/30"
            />
          </div>

          <div>
            <label
              htmlFor="branch"
              className="mb-2 block text-sm font-medium text-foreground-muted"
            >
              {t("الفرع", "Branch")}
            </label>

            <select
              id="branch"
              name="branch"
              defaultValue={reportScope.branchId ?? "all"}
              className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground outline-none focus:border-primary/30"
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
            <label
              htmlFor="staff"
              className="mb-2 block text-sm font-medium text-foreground-muted"
            >
              {t("الموظف المنسوب إليه", "Attributed staff member")}
            </label>

            <select
              id="staff"
              name="staff"
              defaultValue={reportScope.attributedStaffId ?? "all"}
              className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground outline-none focus:border-primary/30"
            >
              <option value="all">{t("كل الموظفين والعمليات غير المنسوبة", "All staff and unattributed operations")}</option>
              {reportStaff.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {[staffMember.firstName, staffMember.lastName]
                    .filter(Boolean)
                    .join(" ") || t("مستخدم بدون اسم", "Unnamed user")}
                  {staffMember.isActive ? "" : t(" (غير نشط)", " (inactive)")}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-semibold text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle sm:w-auto"
          >
            {t("تطبيق الفلتر", "Apply filter")}
          </button>

          <div className="flex flex-wrap gap-2 xl:col-span-2">
            {[
              ["today", t("اليوم", "Today")],
              ["7d", t("آخر 7 أيام", "Last 7 days")],
              ["30d", t("آخر 30 يومًا", "Last 30 days")],
            ].map(([shortcut, label]) => (
              <Link
                key={shortcut}
                href={`/businesses/${business.slug}/reports?period=${shortcut}${reportFilterSuffix}`}
                className={`rounded-[var(--lf-radius-input)] border px-4 py-4 text-center text-sm font-semibold transition ${
                  period === shortcut
                    ? "border-primary/30 bg-primary text-[var(--lf-primary-foreground)]"
                    : "border-border bg-white text-foreground-muted hover:border-primary/30"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </form>

        <section aria-label={copy.summary} className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: language === "AR" ? "عملاء جدد" : "New customers", value: newCustomers, detail: language === "AR" ? "خلال الفترة المحددة" : "In the selected period" },
            { label: language === "AR" ? "الولاء المكتسب" : "Loyalty earned", value: `${numberFormatter.format(earnedAmount)} ${business.unitName}`, detail: language === "AR" ? "رصيد ولاء مسجل" : "Recorded loyalty balance" },
            { label: language === "AR" ? "استبدالات المكافآت" : "Reward redemptions", value: numberFormatter.format(redeemed._count._all), detail: language === "AR" ? "استبدالات مسجلة" : "Recorded redemptions" },
          ].map((metric) => <article key={metric.label} className="rounded-[var(--lf-radius-input)] border border-border bg-surface p-6"><p className="text-sm font-semibold text-foreground-muted">{metric.label}</p><p className="mt-2 text-2xl font-bold text-foreground">{metric.value}</p><p className="mt-2 text-xs text-foreground-subtle">{metric.detail}</p></article>)}
        </section>

        {!simple && <section className="mt-6"><div className="mb-4"><h2 className="text-xl font-bold text-foreground">{copy.historical}</h2><p className="mt-1 text-sm text-foreground-muted">{copy.dateRange}</p></div><ReportCharts language={language} unitName={business.unitName} trends={historicalTrends} /></section>}

        <section className={`${simple ? "hidden " : ""}mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3`}>
          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("إجمالي العملاء", "Total customers")}</p>

            <p className="mt-4 text-4xl font-bold text-foreground">
              {totalCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {segment
                ? t(`ضمن شريحة ${getCustomerSegmentLabel(segment)}`, `In segment ${getCustomerSegmentLabel(segment, language)}`)
                : t("كل العملاء المسجلين", "All registered customers")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("العملاء الجدد", "New customers")}</p>

            <p className="mt-4 text-4xl font-bold text-foreground">
              {newCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("تم تسجيلهم خلال الفترة المحددة", "Registered during the selected period")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("العملاء النشطون", "Active customers")}</p>

            <p className="mt-4 text-4xl font-bold text-foreground">
              {activeCustomerGroups.length}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("عملاء لديهم حركات ولاء", "Customers with loyalty activity")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("العملاء غير النشطين", "Inactive customers")}</p>

            <p className="mt-4 text-4xl font-bold text-foreground">
              {inactiveCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("حسب قاعدة عدم النشاط الحالية", "Based on the current inactivity rule")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("عملاء معرّضون للتوقف", "At-risk customers")}</p>

            <p className="mt-4 text-4xl font-bold text-danger">
              {atRiskCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("توقف نشاطهم مؤخرًا ويحتاجون متابعة", "Their activity recently declined and needs follow-up")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("الحركات", "Transactions")}</p>

            <p className="mt-4 text-4xl font-bold text-foreground">
              {transactionCount}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("عمليات الإضافة والاستبدال", "Earn and redeem operations")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("رصيد الولاء المكتسب", "Loyalty earned")}</p>

            <p className="mt-4 text-4xl font-bold text-success">
              {earnedAmount}
            </p>

            <p dir="auto" className="mt-2 text-xs text-foreground-subtle">
              {earned._count._all} {t("عملية إضافة", "earn operations")} — {business.unitName}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("إجمالي الولاء المكتسب", "Lifetime loyalty earned")}</p>

            <p className="mt-4 text-4xl font-bold text-success">
              {lifetimeEarnedAmount}
            </p>

            <p dir="auto" className="mt-2 text-xs text-foreground-subtle">
              {allTimeEarned._count._all} {t("عملية إضافة منذ بداية البرنامج", "earn operations since programme start")}
            </p>
          </article>

          {business.loyaltyMode === "SALES_AMOUNT" && business.currency && (
            <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
              <p className="text-sm text-foreground-subtle">{t("إجمالي الإنفاق المسجل", "Total recorded spend")}</p>

              <p className="mt-4 text-4xl font-bold text-success">
                {lifetimeTrackedSalesAmount}{business.currency ? ` ${business.currency}` : ""}
              </p>

              <p className="mt-2 text-xs text-foreground-subtle">
                {t("محسوب فقط من عمليات البيع المسجلة في LoyalFlow", "Calculated only from sales recorded in LoyalFlow")}
              </p>
            </article>
          )}

          {business.loyaltyMode === "VISITS" && (
            <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
              <p className="text-sm text-foreground-subtle">{t("إجمالي الزيارات", "Total visits")}</p>

              <p className="mt-4 text-4xl font-bold text-foreground">
                {allTimeVisitCount}
              </p>

              <p className="mt-2 text-xs text-foreground-subtle">
                {t("كل عمليات الإضافة المسجلة كزيارة", "All earn operations recorded as visits")}
              </p>
            </article>
          )}

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("متوسط الوقت لأول مكافأة", "Average time to first reward")}</p>

            <p className="mt-4 text-4xl font-bold text-foreground">
              {averageDaysToFirstReward === null
                ? "—"
                : `${averageDaysToFirstReward.toFixed(1)} ${t("يوم", "days")}`}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("من إنشاء العميل حتى أول استبدال", "From customer creation to first redemption")}
            </p>
          </article>

          {business.loyaltyMode === "SALES_AMOUNT" && business.currency && (
            <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
              <p className="text-sm text-foreground-subtle">{t("متوسط قيمة الشراء", "Average purchase value")}</p>

              <p className="mt-4 text-4xl font-bold text-foreground">
                {averagePurchaseAmount.toFixed(1)}{business.currency ? ` ${business.currency}` : ""}
              </p>

              <p className="mt-2 text-xs text-foreground-subtle">
                {t("متوسط عمليات الشراء المؤهلة خلال الفترة", "Average eligible purchases during the period")}
              </p>
            </article>
          )}

          {business.loyaltyMode === "VISITS" && (
            <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
              <p className="text-sm text-foreground-subtle">{t("متوسط الأيام بين الزيارات", "Average days between visits")}</p>

              <p className="mt-4 text-4xl font-bold text-foreground">
                {averageDaysBetweenVisits === null
                  ? "—"
                  : `${averageDaysBetweenVisits.toFixed(1)} ${t("يوم", "days")}`}
              </p>

              <p className="mt-2 text-xs text-foreground-subtle">
                {t("بين الزيارات المسجلة خلال الفترة المحددة", "Between recorded visits in the selected period")}
              </p>
            </article>
          )}

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("المكافآت المستبدلة", "Rewards redeemed")}</p>

            <p className="mt-4 text-4xl font-bold text-warning">
              {redeemed._count._all}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("إجمالي التكلفة خلال الفترة:", "Total period cost:")} {redeemedCost} — {t("الإجمالي منذ البداية:", "lifetime total:")} {allTimeRedeemed._count._all}
            </p>

            {rewardDistribution.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-foreground-subtle">
                {rewardDistribution.map((reward) => (
                  <li key={reward.rewardName}>
                    {reward.rewardName}: {reward._count._all}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("مكافآت فُتحت", "Rewards unlocked")}</p>

            <p className="mt-4 text-4xl font-bold text-primary">
              {rewardUnlocks}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("مقياس على مستوى النشاط؛ لا يحمل فتح المكافأة فرعًا أو موظفًا في السجل الحالي.", "Business-level metric; reward unlocks do not currently carry branch or staff attribution.")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("أرصدة العملاء الحالية", "Current customer balances")}</p>

            <p className="mt-4 text-4xl font-bold text-primary">
              {currentBalance}
            </p>

            <p dir="auto" className="mt-2 text-xs text-foreground-subtle">
              {t("إجمالي", "Total")} {business.unitName} {t("المتاحة", "available")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("العملاء العائدون", "Repeat customers")}</p>

            <p className="mt-4 text-4xl font-bold text-foreground">
              {returningCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("عميل لديه عمليتا إضافة أو أكثر خلال الفترة", "Customers with two or more earn operations during the period")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("معدل تكرار العملاء", "Repeat customer rate")}</p>

            <p className="mt-4 text-4xl font-bold text-foreground">
              {repeatCustomerRate.toFixed(1)}%
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("العملاء ذوو عمليتي إضافة أو أكثر من العملاء النشطين بالولاء", "Customers with two or more earn operations among loyalty-active customers")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("العملاء المستعادون", "Recovered customers")}</p>

            <p className="mt-4 text-4xl font-bold text-success">
              {recoveredCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("حسابات أعيد تفعيلها خلال الفترة", "Accounts reactivated during the period")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("متوسط نشاط الولاء", "Average loyalty activity")}</p>

            <p className="mt-4 text-4xl font-bold text-foreground">
              {averageLoyaltyActivity.toFixed(1)}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("عمليات إضافة لكل عميل نشط", "Earn operations per active customer")}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-subtle">{t("معدل استبدال المكافآت", "Reward redemption rate")}</p>

            <p className="mt-4 text-4xl font-bold text-foreground">
              {redemptionRate.toFixed(1)}%
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {t("نسبة الاستبدالات إلى عمليات الإضافة", "Redemptions as a share of earn operations")}
            </p>
          </article>
        </section>

        <section className={`${simple ? "hidden " : ""}mt-8 rounded-[var(--lf-radius-card)] border border-border bg-foreground p-6 text-white shadow-sm sm:p-8`}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black text-success">{t("أثر برنامج الولاء", "Loyalty programme impact")}</p>
              <h2 className="mt-1 text-2xl font-black">{t("مؤشرات تشغيلية موثقة", "Documented operational indicators")}</h2>
            </div>

            <p className="max-w-xl text-sm leading-6 text-foreground-subtle">
              {t("تعرض هذه المؤشرات ما سجله LoyalFlow فقط. لا تنسب إيرادًا أو عائدًا للبرنامج ما لم يكن مسجلاً صراحةً كعملية بيع.", "These indicators show only what LoyalFlow recorded. They do not attribute revenue or return to the programme unless explicitly recorded as a sale.")}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: t("عملاء عائدون", "Repeat customers"),
                value: returningCustomers,
                detail: t("عمليتا إضافة أو أكثر خلال الفترة", "Two or more earn operations during the period"),
              },
              {
                label: t("عملاء مستعادون", "Recovered customers"),
                value: recoveredCustomers,
                detail: t("حسابات أعيد تفعيلها خلال الفترة", "Accounts reactivated during the period"),
              },
              {
                label: t("حركات ولاء مسجلة", "Recorded loyalty operations"),
                value: transactionCount,
                detail: t("إضافة، استبدال، أو تعديل ضمن الفترة", "Earn, redeem, or adjustment in the period"),
              },
              {
                label: t("مكافآت مستبدلة", "Rewards redeemed"),
                value: redeemed._count._all,
                detail: t("استبدالات مسجلة خلال الفترة", "Redemptions recorded during the period"),
              },
              {
                label: t("معدل تكرار العملاء", "Repeat customer rate"),
                value: `${repeatCustomerRate.toFixed(1)}%`,
                detail: t("من العملاء ذوي نشاط الولاء", "Among loyalty-active customers"),
              },
              ...(business.loyaltyMode === "SALES_AMOUNT" && business.currency
                ? [
                    {
                      label: t("مبيعات ولاء مسجلة", "Recorded loyalty sales"),
                      value: `${trackedSalesAmount}${business.currency ? ` ${business.currency}` : ""}`,
                      detail: t("مبيعات أدخلها الموظفون خلال الفترة، وليست إسنادًا تسويقيًا", "Sales entered by staff during the period; not marketing attribution"),
                    },
                  ]
                : []),
            ].map((metric) => (
              <article key={metric.label} className="rounded-[var(--lf-radius-card)] bg-white/10 p-4">
                <p className="text-sm text-foreground-subtle">{metric.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{metric.value}</p>
                <p className="mt-2 text-xs leading-5 text-foreground-subtle">{metric.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${simple ? "hidden " : ""}mt-8 grid gap-6 lg:grid-cols-3`}>
          {[
            {
              title: t("الأكثر نشاطًا", "Most active"),
              description: t("حسب كل حركات الولاء خلال الفترة.", "Based on all loyalty operations in the period."),
              items: mostActiveCustomers,
              suffix: t("حركة", "operations"),
            },
            {
              title: t("أعلى قيمة مكتسبة", "Highest earned value"),
              description: t("حسب الرصيد المكتسب خلال الفترة.", "Based on loyalty earned during the period."),
              items: highestValueEarnedCustomers,
              suffix: business.unitName,
            },
            {
              title: t("الأكثر استبدالًا", "Most redemptions"),
              description: t("حسب المكافآت المستبدلة خلال الفترة.", "Based on rewards redeemed during the period."),
              items: mostRedeemedCustomers,
              suffix: t("مكافأة", "rewards"),
            },
          ].map((ranking) => (
            <article
              key={ranking.title}
              className="rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-foreground">
                {ranking.title}
              </h2>

              <p className="mt-1 text-sm text-foreground-subtle">
                {ranking.description}
              </p>

              <div className="mt-6 space-y-4">
                {ranking.items.length === 0 ? (
                  <p className="text-sm text-foreground-subtle">
                    {t("لا توجد بيانات خلال هذه الفترة.", "There is no data for this period.")}
                  </p>
                ) : (
                  ranking.items.map(({ customer, value }, index) => (
                    <Link
                      key={customer.id}
                      href={`/businesses/${business.slug}/customers/${customer.id}`}
                      className="flex items-center gap-4 rounded-[var(--lf-radius-card)] border border-border p-4 transition hover:border-primary/30 hover:bg-primary-subtle"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-white">
                        {index + 1}
                      </span>

                      <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                        {getCustomerName(customer)}
                      </span>

                      <span className="text-sm font-bold text-primary">
                        {value} {ranking.suffix}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </article>
          ))}
        </section>

        <section className={`${simple ? "hidden " : ""}mt-8 grid gap-8 xl:grid-cols-[1fr_360px]`}>
          <div className="overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-white shadow-sm">
            <div className="border-b border-border px-4 py-6 sm:px-6">
              <h2 className="text-xl font-bold text-foreground">{t("أحدث الحركات", "Latest transactions")}</h2>

              <p className="mt-1 text-sm text-foreground-subtle">
                {t("أحدث 50 عملية خلال الفترة المحددة.", "The latest 50 operations in the selected period.")}
              </p>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-10 text-center text-foreground-subtle">
                {t("لا توجد حركات خلال هذه الفترة.", "There are no transactions in this period.")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-foreground-subtle">
                    <tr>
                      <th className="px-6 py-4">{t("العميل", "Customer")}</th>

                      <th className="px-6 py-4">{t("النوع", "Type")}</th>

                      <th className="px-6 py-4">{t("القيمة", "Value")}</th>

                      <th className="px-6 py-4">{t("الرصيد", "Balance")}</th>

                      <th className="px-6 py-4">{t("الموظف", "Staff")}</th>

                      <th className="px-6 py-4">{t("التاريخ", "Date")}</th>
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
                        : t("النظام", "System");

                      return (
                        <tr key={transaction.id} className="hover:bg-surface-subtle">
                          <td className="px-6 py-4">
                            <Link
                              href={`/businesses/${business.slug}/customers/${transaction.customer.id}`}
                              className="font-semibold text-foreground hover:text-primary"
                            >
                              {customerName}
                            </Link>

                            <p className="mt-1 text-xs text-foreground-subtle">
                              {transaction.customer.customerCode}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={
                                transaction.type === "EARN"
                                  ? "rounded-full bg-success-subtle px-4 py-1 text-xs font-semibold text-success"
                                  : transaction.type === "REDEEM"
                                    ? "rounded-full bg-warning-subtle px-4 py-1 text-xs font-semibold text-warning"
                                    : "rounded-full bg-surface-subtle px-4 py-1 text-xs font-semibold text-foreground-muted"
                              }
                            >
                              {transaction.type === "EARN"
                                ? t("إضافة رصيد", "Earn")
                                : transaction.type === "REDEEM"
                                  ? t("استبدال مكافأة", "Reward redemption")
                                  : t("تعديل رصيد", "Balance adjustment")}
                            </span>
                          </td>

                          <td
                            className={`px-6 py-4 font-bold ${
                              transaction.amount >= 0
                                ? "text-success"
                                : "text-warning"
                            }`}
                          >
                            {transaction.amount > 0 ? "+" : ""}
                            {transaction.amount}
                          </td>

                          <td className="px-6 py-4 font-semibold text-foreground-muted">
                            {transaction.balanceAfter}
                          </td>

                          <td className="px-6 py-4 text-foreground-muted">
                            {employeeName}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-foreground-subtle">
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

          <aside className="h-fit rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground">{t("أفضل العملاء", "Top customers")}</h2>

            <p className="mt-1 text-sm text-foreground-subtle">
              {t("الترتيب حسب إجمالي رصيد الولاء المكتسب.", "Ranked by total loyalty earned.")}
            </p>

            <div className="mt-6 space-y-4">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-foreground-subtle">
                  {t("لا يوجد عملاء حتى الآن.", "There are no customers yet.")}
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
                      className="flex items-center gap-4 rounded-[var(--lf-radius-card)] border border-border p-4 transition hover:border-primary/30 hover:bg-primary-subtle"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-white">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">
                          {customerName}
                        </p>

                        <p className="mt-1 text-xs text-foreground-subtle">
                          {customer.customerCode}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-primary">
                          {customer.lifetimeEarned}
                        </p>

                        <p className="text-xs text-foreground-subtle">
                          {t("الرصيد", "Balance")} {customer.balance}
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
