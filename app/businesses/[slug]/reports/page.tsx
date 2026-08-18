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
import { canExportBusinessData, canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
import { createHistoricalAnalyticsTrends } from "@/lib/analytics/trends";
import {
  getExperienceModeCookieName,
  resolveExperienceMode,
} from "@/lib/experience-mode";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { reportCopy } from "@/lib/reports/presentation";
import {
  formatLoyaltyAmount,
  operationalUnitLabel,
} from "@/lib/loyalty/presentation";
import { countOpenReversalExceptions } from "@/lib/loyalty/reversal-exception-reporting";
import { summarizeLedgerOperations } from "@/lib/loyalty/ledger-reporting";
import { hasFeatureEntitlement } from "@/lib/entitlements";
import type { Prisma } from "@/generated/prisma/client";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Download,
  Filter,
  Gift,
  LineChart,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
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

const reportPeriods = ["today", "7d", "30d"] as const;

const reportFieldClass =
  "min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft";

type ReportPeriod = (typeof reportPeriods)[number] | "custom";

function getReportRange(period: ReportPeriod, now: Date) {
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
  switch (mode) {
    case "VISITS":
      return language === "AR" ? "الزيارات" : "Visits";
    case "POINTS":
      return language === "AR" ? "النقاط" : "Points";
    case "SALES_AMOUNT":
      return language === "AR" ? "المبيعات" : "Sales amount";
    default:
      return mode;
  }
}

function getCustomerName(customer: {
  firstName: string;
  lastName: string | null;
}) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ");
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
      plan: true,
    },
  });

  if (!business) {
    notFound();
  }

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
  const dateTimeFormatter = new Intl.DateTimeFormat(getLanguageLocale(language), {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const loyaltyPresentation = {
    loyaltyMode: business.loyaltyMode,
    language,
    unitName: business.unitName,
    currency: business.currency,
  } as const;

  const canViewReports = canPerform(session.user, business.id, "REPORTS_VIEW");

  if (!canViewReports) {
    redirect(`/businesses/${business.slug}`);
  }

  if (!hasFeatureEntitlement(business.plan, "REPORTING")) {
    redirect(`/businesses/${business.slug}?error=plan-feature`);
  }

  const today = new Date();
  const requestedPeriod = reportPeriods.includes(
    query.period as (typeof reportPeriods)[number],
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

  const availableSegments = getCustomerFilterSegments(business.loyaltyMode);
  const segment = availableSegments.includes(query.segment as CustomerSegment)
    ? (query.segment as CustomerSegment)
    : null;

  // A business has exactly one active loyalty programme in the current schema.
  // Keeping the selected mode in the report URL makes the filter explicit now
  // and keeps links forward-compatible if businesses later support programmes.
  const loyaltyMode =
    query.loyaltyMode === business.loyaltyMode ? business.loyaltyMode : "all";

  const [reportBranches, reportStaff] = await Promise.all([
    prisma.branch.findMany({
      where: { businessId: business.id },
      select: { id: true, businessId: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { businessId: business.id },
      select: {
        id: true,
        businessId: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);
  // Invalid/cross-tenant route values are ignored on the HTML report. The
  // export route rejects them; neither path can expand this tenant's scope.
  const reportScope =
    resolveReportScope({
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
          business.earnAmount,
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
    openReversalExceptions,
    ledgerOperations,
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
          getCustomerSegmentWhere("INACTIVE", business.rewardThreshold),
        ],
      },
    }),

    prisma.customer.count({
      where: {
        AND: [
          customerWhere,
          getCustomerSegmentWhere("AT_RISK", business.rewardThreshold),
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

    countOpenReversalExceptions(prisma, {
      businessId: business.id,
      from: fromDate,
      to: toDate,
      ...operationScope,
      ...(segment ? { customerWhere } : {}),
    }),

    prisma.loyaltyTransaction.findMany({
      where: transactionWhere,
      select: {
        type: true,
        amount: true,
        saleAmount: true,
        reversalKind: true,
      },
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

  const ledgerSummary = summarizeLedgerOperations(ledgerOperations, {
    unresolvedExceptions: openReversalExceptions,
  });

  const salesPresentation = {
    loyaltyMode: "SALES_AMOUNT",
    language,
    unitName: business.unitName,
    currency: business.currency,
  } as const;

  const earnedAmount = earned._sum.amount ?? 0;

  const lifetimeEarnedAmount = allTimeEarned._sum.amount ?? 0;

  const trackedSalesAmount = trackedSales._sum.saleAmount ?? 0;

  const lifetimeTrackedSalesAmount = allTimeTrackedSales._sum.saleAmount ?? 0;

  const recoveredCustomers = countDistinctCustomers(recoveredCustomerGroups);

  const redeemedCost = redeemed._sum.cost ?? 0;

  const currentBalance = currentBalances._sum.balance ?? 0;

  const firstRewardCustomers =
    firstRewardGroups.length > 0
      ? await prisma.customer.findMany({
          where: {
            id: {
              in: firstRewardGroups.map((reward) => reward.customerId),
            },
            businessId: business.id,
          },
          select: {
            id: true,
            createdAt: true,
          },
        })
      : [];

  const averageDaysToFirstReward = calculateAverageDaysToFirstReward(
    firstRewardCustomers,
    firstRewardGroups.map((reward) => ({
      customerId: reward.customerId,
      firstRewardAt: reward._min.createdAt,
    })),
  );

  const rankingCustomerIds = Array.from(
    new Set(
      [
        ...mostActiveGroups,
        ...highestValueEarnedGroups,
        ...mostRedeemedGroups,
      ].map((group) => group.customerId),
    ),
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
    rankingCustomers.map((customer) => [customer.id, customer]),
  );

  const mostActiveCustomers = mostActiveGroups.flatMap((group) => {
    const customer = rankingCustomersById.get(group.customerId);

    return customer ? [{ customer, value: group._count._all }] : [];
  });

  const highestValueEarnedCustomers = highestValueEarnedGroups.flatMap(
    (group) => {
      const customer = rankingCustomersById.get(group.customerId);

      return customer ? [{ customer, value: group._sum.amount ?? 0 }] : [];
    },
  );

  const mostRedeemedCustomers = mostRedeemedGroups.flatMap((group) => {
    const customer = rankingCustomersById.get(group.customerId);

    return customer ? [{ customer, value: group._count._all }] : [];
  });

  const returningCustomers = returningCustomerGroups.filter(
    (customer) => customer._count._all >= 2,
  ).length;

  const repeatCustomerRate = calculateRepeatCustomerRate(
    returningCustomers,
    returningCustomerGroups.length,
  );

  const averageDaysBetweenVisits =
    business.loyaltyMode === "VISITS"
      ? calculateAverageDaysBetweenVisits(visitEvents)
      : null;

  const averageLoyaltyActivity =
    activeCustomerGroups.length > 0
      ? earned._count._all / activeCustomerGroups.length
      : 0;

  const redemptionRate =
    earned._count._all > 0
      ? (redeemed._count._all / earned._count._all) * 100
      : 0;

  const averagePurchaseAmount = trackedSales._avg.saleAmount ?? 0;

  const canExportData = canExportBusinessData(
    session.user,
    business.id,
    business.allowOwnerDataExport,
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
    ...(reportScope.attributedStaffId
      ? { staff: reportScope.attributedStaffId }
      : {}),
  }).toString();

  const reportFilterSuffix = activeReportFilters
    ? `&${activeReportFilters}`
    : "";

  // The chart receives only server-derived daily buckets. It intentionally does
  // not reimplement analytics mathematics in a client component.
  const [historicalCustomers, historicalEarned, historicalRedemptions] =
    await Promise.all([
      prisma.customer.findMany({
        where: { ...customerWhere, createdAt: { gte: fromDate, lte: toDate } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.loyaltyTransaction.findMany({
        where: { ...transactionWhere, type: "EARN" },
        select: { createdAt: true, amount: true },
      }),
      prisma.rewardRedemption.findMany({
        where: redemptionWhere,
        select: { createdAt: true },
      }),
    ]);
  const historicalTrends = createHistoricalAnalyticsTrends(
    {
      customers: historicalCustomers,
      loyaltyEarned: historicalEarned,
      rewardsRedeemed: historicalRedemptions,
    },
    fromDate,
    toDate,
  );

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
        data-reports-workspace="true"
      >
        <Link
          href={`/businesses/${business.slug}`}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-foreground-muted transition-colors hover:text-primary"
        >
          {language === "AR" ? "العودة إلى" : "Back to"} {business.name}
        </Link>

        <header className="relative mt-5 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="pointer-events-none absolute end-0 top-0 size-64 rounded-full bg-[radial-gradient(circle,var(--lf-primary-soft),transparent_68%)]" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                <LineChart className="size-4" aria-hidden="true" />
                {copy.overview}
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {language === "AR"
                  ? "التقارير والتحليلات"
                  : "Reports & analytics"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-foreground-muted">
                {language === "AR"
                  ? "اقرأ أداء برنامج الولاء من السجل الفعلي، مع فصل واضح بين الرصيد والمبيعات والاستبدالات."
                  : "Read loyalty performance from the actual ledger, with a clear separation between balances, sales, and redemptions."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="rounded-[var(--lf-radius-input)] border border-border bg-surface/90 px-4 py-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-foreground-subtle">
                  <CalendarDays
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  {language === "AR" ? "الفترة" : "Period"}
                </p>
                <p
                  dir="ltr"
                  className="lf-type-numeric mt-1 text-sm font-black text-foreground"
                >
                  {fromInput} → {toInput}
                </p>
              </div>
              <div className="rounded-[var(--lf-radius-input)] border border-border bg-surface/90 px-4 py-3">
                <p className="text-xs font-semibold text-foreground-subtle">
                  {language === "AR" ? "طريقة العرض" : "View mode"}
                </p>
                <p className="mt-1 text-sm font-black text-foreground">
                  {simple ? copy.simple : copy.advanced}
                </p>
              </div>
            </div>
          </div>
        </header>

        <ReportNavigation
          slug={business.slug}
          active="overview"
          query={reportQuery}
          language={language}
        />

        <section
          aria-label={language === "AR" ? "إجراءات التقارير" : "Report actions"}
          className="mt-5 flex flex-wrap gap-2"
        >
          <Link
            href={`/businesses/${business.slug}/reports/staff?${reportQuery}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-bold text-foreground-muted transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Users className="size-4" aria-hidden="true" />
            {language === "AR" ? "أداء الموظفين" : "Staff performance"}
          </Link>

          {canExportData && (
            <a
              href={`/businesses/${business.slug}/reports/export?${reportQuery}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-900 transition-colors hover:bg-emerald-100"
            >
              <Download className="size-4" aria-hidden="true" />
              {language === "AR"
                ? "تصدير حركات الفترة CSV"
                : "Export period activity CSV"}
            </a>
          )}
          {!canExportData && (
            <p
              role="status"
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] bg-surface-subtle px-4 text-sm font-semibold text-foreground-subtle"
            >
              <ShieldAlert className="size-4" aria-hidden="true" />
              {copy.exportUnavailable}
            </p>
          )}
        </section>

        <details
          className="group mt-5 rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm"
          open={!simple}
          data-report-filters="true"
        >
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Filter className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-black text-foreground">
                  {language === "AR"
                    ? "الفترة ونطاق التقرير"
                    : "Period & report scope"}
                </span>
                <span className="mt-0.5 block text-xs text-foreground-subtle">
                  {language === "AR"
                    ? "غيّر التاريخ أو الشريحة أو الفرع أو الموظف عند الحاجة."
                    : "Change dates, segment, branch, or staff when needed."}
                </span>
              </span>
            </span>
            <span className="text-xs font-bold text-primary">
              {language === "AR" ? "تعديل" : "Edit"}
            </span>
          </summary>
          <form
            method="get"
            className="grid gap-4 border-t border-border p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3"
          >
            <input name="period" type="hidden" value="custom" />
            <div>
              <label
                htmlFor="from"
                className="mb-2 block text-sm font-medium text-foreground-muted"
              >
                {language === "AR" ? "من تاريخ" : "From date"}
              </label>

              <input
                id="from"
                name="from"
                type="date"
                defaultValue={fromInput}
                className={reportFieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="segment"
                className="mb-2 block text-sm font-medium text-foreground-muted"
              >
                {language === "AR" ? "شريحة العملاء" : "Customer segment"}
              </label>

              <select
                id="segment"
                name="segment"
                defaultValue={segment ?? "all"}
                className={reportFieldClass}
              >
                <option value="all">
                  {language === "AR" ? "كل الشرائح" : "All segments"}
                </option>
                {availableSegments.map((customerSegment) => (
                  <option key={customerSegment} value={customerSegment}>
                    {getCustomerSegmentLabel(customerSegment, language)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="loyaltyMode"
                className="mb-2 block text-sm font-medium text-foreground-muted"
              >
                {language === "AR" ? "برنامج الولاء" : "Loyalty programme"}
              </label>

              <select
                id="loyaltyMode"
                name="loyaltyMode"
                defaultValue={loyaltyMode}
                className={reportFieldClass}
              >
                <option value="all">
                  {language === "AR"
                    ? "كل البرامج المتاحة"
                    : "All available programmes"}
                </option>
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
                {language === "AR" ? "إلى تاريخ" : "To date"}
              </label>

              <input
                id="to"
                name="to"
                type="date"
                defaultValue={toInput}
                className={reportFieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="branch"
                className="mb-2 block text-sm font-medium text-foreground-muted"
              >
                {language === "AR" ? "الفرع" : "Branch"}
              </label>

              <select
                id="branch"
                name="branch"
                defaultValue={reportScope.branchId ?? "all"}
                className={reportFieldClass}
              >
                <option value="all">
                  {language === "AR"
                    ? "كل الفروع والسجل التاريخي"
                    : "All branches and historical records"}
                </option>
                {reportBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                    {branch.isActive
                      ? ""
                      : language === "AR"
                        ? " (غير نشط)"
                        : " (inactive)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="staff"
                className="mb-2 block text-sm font-medium text-foreground-muted"
              >
                {language === "AR" ? "الموظف المنسوب إليه" : "Attributed staff"}
              </label>

              <select
                id="staff"
                name="staff"
                defaultValue={reportScope.attributedStaffId ?? "all"}
                className={reportFieldClass}
              >
                <option value="all">
                  {language === "AR"
                    ? "كل الموظفين والعمليات غير المنسوبة"
                    : "All staff and unattributed operations"}
                </option>
                {reportStaff.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {[staffMember.firstName, staffMember.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                      (language === "AR" ? "مستخدم بدون اسم" : "Unnamed user")}
                    {staffMember.isActive
                      ? ""
                      : language === "AR"
                        ? " (غير نشط)"
                        : " (inactive)"}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary-hover sm:w-auto"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {copy.apply}
            </button>

            <div className="flex flex-wrap gap-2 xl:col-span-2">
              {[
                ["today", language === "AR" ? "اليوم" : "Today"],
                ["7d", language === "AR" ? "آخر 7 أيام" : "Last 7 days"],
                ["30d", language === "AR" ? "آخر 30 يومًا" : "Last 30 days"],
              ].map(([shortcut, label]) => (
                <Link
                  key={shortcut}
                  href={`/businesses/${business.slug}/reports?period=${shortcut}${reportFilterSuffix}`}
                  className={`inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border px-4 text-center text-sm font-bold transition-colors ${
                    period === shortcut
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-foreground-muted hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </form>
        </details>

        <section
          aria-label={copy.summary}
          data-report-summary="true"
          className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            {
              icon: Users,
              tone: "primary",
              label: language === "AR" ? "عملاء جدد" : "New customers",
              value: newCustomers,
              detail:
                language === "AR"
                  ? "خلال الفترة المحددة"
                  : "In the selected period",
            },
            {
              icon: Sparkles,
              tone: "success",
              label: language === "AR" ? "الولاء المكتسب" : "Loyalty earned",
              value: formatLoyaltyAmount({
                ...loyaltyPresentation,
                amount: earnedAmount,
              }),
              detail:
                language === "AR"
                  ? "رصيد ولاء مسجل"
                  : "Recorded loyalty balance",
            },
            {
              icon: Gift,
              tone: "warning",
              label:
                language === "AR" ? "استبدالات المكافآت" : "Reward redemptions",
              value: numberFormatter.format(redeemed._count._all),
              detail:
                language === "AR" ? "استبدالات مسجلة" : "Recorded redemptions",
            },
            {
              icon: ShieldAlert,
              tone: "danger",
              label:
                language === "AR" ? "عمليات عكس معلقة" : "Unresolved reversals",
              value: numberFormatter.format(openReversalExceptions),
              detail:
                language === "AR"
                  ? "رصيد غير كافٍ ويحتاج متابعة"
                  : "Insufficient balance requires follow-up",
              href: `/businesses/${business.slug}/reports/reversal-exceptions`,
            },
          ].map((metric) => {
            const Icon = metric.icon;
            const toneClass =
              metric.tone === "success"
                ? "bg-emerald-50 text-emerald-700"
                : metric.tone === "warning"
                  ? "bg-amber-50 text-amber-700"
                  : metric.tone === "danger"
                    ? "bg-red-50 text-red-700"
                    : "bg-primary-soft text-primary";
            const content = (
              <>
                <span
                  className={`grid size-9 place-items-center rounded-xl ${toneClass}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <p className="mt-4 text-xs font-semibold text-foreground-subtle">
                  {metric.label}
                </p>
                <p className="lf-type-numeric mt-1 text-2xl font-black text-foreground">
                  {metric.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-foreground-muted">
                  {metric.detail}
                </p>
              </>
            );

            return metric.href ? (
              <Link
                key={metric.label}
                href={metric.href}
                className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-4 shadow-sm transition-colors hover:bg-surface-subtle sm:p-5"
              >
                {content}
              </Link>
            ) : (
              <article
                key={metric.label}
                className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5"
              >
                {content}
              </article>
            );
          })}
        </section>

        <section
          aria-label={
            language === "AR"
              ? "صافي عمليات الولاء"
              : "Ledger gross and net summary"
          }
          data-ledger-summary="gross-reversal-net"
          className="mt-5 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <TrendingUp className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {language === "AR" ? "سلامة السجل" : "Ledger integrity"}
              </p>
              <h2 className="mt-1 text-lg font-black text-foreground">
                {language === "AR"
                  ? "الإجمالي والعكس والصافي"
                  : "Gross, reversals & net"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground-muted">
                {language === "AR"
                  ? "الأرقام محسوبة من سجل الحركات للفترة والفلاتر الحالية بدون تعديل السجل التاريخي."
                  : "Calculated from the immutable ledger using the current period and filters."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
                {language === "AR" ? "الولاء المكتسب" : "Earned loyalty"}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>{language === "AR" ? "الإجمالي" : "Gross earned"}</dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...loyaltyPresentation,
                      amount: ledgerSummary.grossEarned,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>
                    {language === "AR" ? "عمليات العكس" : "Earn reversals"}
                  </dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...loyaltyPresentation,
                      amount: ledgerSummary.earnReversed,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="font-bold">
                    {language === "AR" ? "الصافي" : "Net earned"}
                  </dt>
                  <dd className="font-bold">
                    {formatLoyaltyAmount({
                      ...loyaltyPresentation,
                      amount: ledgerSummary.netEarned,
                    })}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
                {language === "AR" ? "الاستبدالات" : "Redemptions"}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>
                    {language === "AR" ? "إجمالي المستبدل" : "Gross redeemed"}
                  </dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...loyaltyPresentation,
                      amount: ledgerSummary.grossRedeemed,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>
                    {language === "AR"
                      ? "عكس الاستبدالات"
                      : "Redemption reversals"}
                  </dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...loyaltyPresentation,
                      amount: ledgerSummary.redemptionReversed,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="font-bold">
                    {language === "AR" ? "صافي المستبدل" : "Net redeemed"}
                  </dt>
                  <dd className="font-bold">
                    {formatLoyaltyAmount({
                      ...loyaltyPresentation,
                      amount: ledgerSummary.netRedeemed,
                    })}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
                {language === "AR" ? "المبيعات المسجلة" : "Recorded sales"}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>
                    {language === "AR"
                      ? "إجمالي المبيعات"
                      : "Gross recorded sales"}
                  </dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...salesPresentation,
                      amount: ledgerSummary.grossRecordedSales,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>
                    {language === "AR" ? "المبيعات المرتجعة" : "Refunded sales"}
                  </dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...salesPresentation,
                      amount: ledgerSummary.refundedSales,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="font-bold">
                    {language === "AR" ? "صافي المبيعات" : "Net recorded sales"}
                  </dt>
                  <dd className="font-bold">
                    {formatLoyaltyAmount({
                      ...salesPresentation,
                      amount: ledgerSummary.netRecordedSales,
                    })}
                  </dd>
                </div>
              </dl>
            </article>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <p className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3 text-sm text-foreground-muted">
              {language === "AR" ? "التعديلات اليدوية" : "Manual adjustments"}:{" "}
              +
              {formatLoyaltyAmount({
                ...loyaltyPresentation,
                amount: ledgerSummary.adjustmentAdds,
              })}{" "}
              / -
              {formatLoyaltyAmount({
                ...loyaltyPresentation,
                amount: ledgerSummary.adjustmentSubtracts,
              })}
            </p>
            <p className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3 text-sm text-foreground-muted">
              {language === "AR" ? "عمليات عكس معلقة" : "Unresolved reversals"}:{" "}
              {numberFormatter.format(ledgerSummary.unresolvedExceptions)}
            </p>
            <p className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3 text-sm text-foreground-muted">
              {language === "AR"
                ? "حركات عكس غير صالحة"
                : "Invalid reversal rows"}
              : {numberFormatter.format(ledgerSummary.invalidReversalCount)}
            </p>
          </div>
        </section>

        {!simple && (
          <section className="mt-6" data-report-trends="server-derived">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Activity className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {copy.trends}
                </p>
                <h2 className="mt-1 text-xl font-black text-foreground">
                  {copy.historical}
                </h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  {copy.dateRange}
                </p>
              </div>
            </div>
            <ReportCharts
              language={language}
              unitName={business.unitName}
              trends={historicalTrends}
            />
          </section>
        )}

        <section
          className={`${simple ? "hidden " : ""}mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3`}
        >
          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.totalCustomers}</p>

            <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
              {totalCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {segment
                ? `${copy.withinSegment} ${getCustomerSegmentLabel(segment, language)}`
                : copy.allRegisteredCustomers}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.newCustomers}</p>

            <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
              {newCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.registeredInPeriod}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.activeCustomers}</p>

            <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
              {activeCustomerGroups.length}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.customersWithLoyaltyActivity}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.inactiveCustomers}</p>

            <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
              {inactiveCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.inactivityRule}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.atRiskCustomers}</p>

            <p className="mt-3 text-4xl font-bold text-rose-600">
              {atRiskCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.atRiskDetail}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.operations}</p>

            <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
              {transactionCount}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.earnAndRedeemOperations}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.earnedBalance}</p>

            <p className="mt-3 text-4xl font-bold text-emerald-600">
              {formatLoyaltyAmount({
                ...loyaltyPresentation,
                amount: earnedAmount,
              })}
            </p>

            <p dir="auto" className="mt-2 text-xs text-foreground-subtle">
              {numberFormatter.format(earned._count._all)} {copy.earnOperation} —{" "}
              {operationalUnitLabel(loyaltyPresentation)}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.lifetimeEarned}</p>

            <p className="mt-3 text-4xl font-bold text-emerald-700">
              {formatLoyaltyAmount({
                ...loyaltyPresentation,
                amount: lifetimeEarnedAmount,
              })}
            </p>

            <p dir="auto" className="mt-2 text-xs text-foreground-subtle">
              {numberFormatter.format(allTimeEarned._count._all)} {copy.earnOperation} {copy.sinceProgramStart}
            </p>
          </article>

          {business.loyaltyMode === "SALES_AMOUNT" && business.currency && (
            <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
              <p className="text-sm text-foreground-muted">{copy.totalTrackedSpend}</p>

              <p className="mt-3 text-4xl font-bold text-emerald-700">
                {formatLoyaltyAmount({
                  ...loyaltyPresentation,
                  amount: lifetimeTrackedSalesAmount,
                })}
              </p>

              <p className="mt-2 text-xs text-foreground-subtle">
                {copy.trackedSalesOnly}
              </p>
            </article>
          )}

          {business.loyaltyMode === "VISITS" && (
            <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
              <p className="text-sm text-foreground-muted">{copy.totalVisits}</p>

              <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
                {allTimeVisitCount}
              </p>

              <p className="mt-2 text-xs text-foreground-subtle">
                {copy.allRecordedVisits}
              </p>
            </article>
          )}

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.averageFirstReward}</p>

            <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
              {averageDaysToFirstReward === null
                ? "—"
                : `${averageDaysToFirstReward.toFixed(1)} ${copy.days}`}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.fromCustomerToFirstRedemption}
            </p>
          </article>

          {business.loyaltyMode === "SALES_AMOUNT" && business.currency && (
            <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
              <p className="text-sm text-foreground-muted">{copy.averagePurchase}</p>

              <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
                {averagePurchaseAmount.toFixed(1)}
                {business.currency ? ` ${business.currency}` : ""}
              </p>

              <p className="mt-2 text-xs text-foreground-subtle">
                {copy.eligiblePurchaseAverage}
              </p>
            </article>
          )}

          {business.loyaltyMode === "VISITS" && (
            <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
              <p className="text-sm text-foreground-muted">{copy.averageDaysBetweenVisits}</p>

              <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
                {averageDaysBetweenVisits === null
                  ? "—"
                  : `${averageDaysBetweenVisits.toFixed(1)} ${copy.days}`}
              </p>

              <p className="mt-2 text-xs text-foreground-subtle">
                {copy.recordedVisitSpacing}
              </p>
            </article>
          )}

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.redeemedRewards}</p>

            <p className="mt-3 text-4xl font-bold text-amber-600">
              {redeemed._count._all}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.periodCost}: {numberFormatter.format(redeemedCost)} — {copy.lifetimeTotal}:{" "}
              {allTimeRedeemed._count._all}
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

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.unlockedRewards}</p>

            <p className="mt-3 text-4xl font-bold text-violet-600">
              {rewardUnlocks}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.unlockScopeDetail}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.currentBalances}</p>

            <p className="mt-3 text-4xl font-bold text-violet-600">
              {formatLoyaltyAmount({
                ...loyaltyPresentation,
                amount: currentBalance,
              })}
            </p>

            <p dir="auto" className="mt-2 text-xs text-foreground-subtle">
              {copy.availableBalanceTotal}: {operationalUnitLabel(loyaltyPresentation)}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.returningCustomers}</p>

            <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
              {returningCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.returningDetail}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.repeatCustomerRate}</p>

            <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
              {repeatCustomerRate.toFixed(1)}%
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.repeatCustomerDetail}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.recoveredCustomers}</p>

            <p className="mt-3 text-4xl font-bold text-emerald-600">
              {recoveredCustomers}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.recoveredDetail}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.averageLoyaltyActivity}</p>

            <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
              {averageLoyaltyActivity.toFixed(1)}
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.averageLoyaltyDetail}
            </p>
          </article>

          <article className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm text-foreground-muted">{copy.redemptionRate}</p>

            <p className="mt-3 lf-type-numeric text-4xl font-bold text-foreground">
              {redemptionRate.toFixed(1)}%
            </p>

            <p className="mt-2 text-xs text-foreground-subtle">
              {copy.redemptionRateDetail}
            </p>
          </article>
        </section>

        <section
          className={`${simple ? "hidden " : ""}mt-8 rounded-[var(--lf-radius-card)] border border-border bg-foreground p-5 text-background shadow-sm sm:p-7`}
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black text-emerald-300">
                {copy.impactEyebrow}
              </p>
              <h2 className="mt-1 text-2xl font-black">{copy.verifiedOperationalMetrics}</h2>
            </div>

            <p className="max-w-xl text-sm leading-6 text-background/70">
              {copy.impactDisclaimer}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: copy.returningCustomers,
                value: returningCustomers,
                detail: copy.twoOrMoreEarns,
              },
              {
                label: copy.recoveredCustomers,
                value: recoveredCustomers,
                detail: copy.recoveredDetail,
              },
              {
                label: copy.loyaltyOperations,
                value: transactionCount,
                detail: copy.loyaltyOperationsDetail,
              },
              {
                label: copy.redeemedRewards,
                value: redeemed._count._all,
                detail: copy.redemptionsInPeriod,
              },
              {
                label: copy.repeatCustomerRate,
                value: `${repeatCustomerRate.toFixed(1)}%`,
                detail: copy.amongLoyaltyActive,
              },
              ...(business.loyaltyMode === "SALES_AMOUNT" && business.currency
                ? [
                    {
                      label: copy.trackedLoyaltySales,
                      value: `${trackedSalesAmount}${business.currency ? ` ${business.currency}` : ""}`,
                      detail:
                        copy.trackedLoyaltySalesDetail,
                    },
                  ]
                : []),
            ].map((metric) => (
              <article
                key={metric.label}
                className="rounded-2xl bg-background/10 p-4"
              >
                <p className="text-sm text-background/70">{metric.label}</p>
                <p className="mt-2 text-3xl font-black text-background">
                  {metric.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-background/70">
                  {metric.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          className={`${simple ? "hidden " : ""}mt-8 grid gap-5 lg:grid-cols-3`}
        >
          {[
            {
              title: copy.mostActive,
              description: copy.mostActiveDescription,
              items: mostActiveCustomers,
              suffix: copy.movement,
            },
            {
              title: copy.highestEarned,
              description: copy.highestEarnedDescription,
              items: highestValueEarnedCustomers,
              suffix: business.unitName,
            },
            {
              title: copy.mostRedeemed,
              description: copy.mostRedeemedDescription,
              items: mostRedeemedCustomers,
              suffix: copy.reward,
            },
          ].map((ranking) => (
            <article
              key={ranking.title}
              className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-foreground">
                {ranking.title}
              </h2>

              <p className="mt-1 text-sm text-foreground-muted">
                {ranking.description}
              </p>

              <div className="mt-5 space-y-3">
                {ranking.items.length === 0 ? (
                  <p className="text-sm text-foreground-muted">
                    {copy.noData}
                  </p>
                ) : (
                  ranking.items.map(({ customer, value }, index) => (
                    <Link
                      key={customer.id}
                      href={`/businesses/${business.slug}/customers/${customer.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border p-3 transition hover:border-primary/30 hover:bg-primary-soft"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
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

        <section
          className={`${simple ? "hidden " : ""}mt-8 grid gap-8 xl:grid-cols-[1fr_360px]`}
        >
          <div className="overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-5 sm:px-6">
              <h2 className="text-xl font-bold text-foreground">{copy.recentTransactions}</h2>

              <p className="mt-1 text-sm text-foreground-muted">
                {copy.recentTransactionsDetail}
              </p>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                {copy.noTransactions}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table dir={language === "AR" ? "rtl" : "ltr"} className="min-w-full text-start text-sm">
                  <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4">{copy.customer}</th>

                      <th className="px-6 py-4">{copy.type}</th>

                      <th className="px-6 py-4">{copy.value}</th>

                      <th className="px-6 py-4">{copy.balance}</th>

                      <th className="px-6 py-4">{copy.staffMember}</th>

                      <th className="px-6 py-4">{copy.date}</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
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
                        : copy.system;

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
                                  ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                                  : transaction.type === "REDEEM"
                                    ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                                    : "rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-foreground-muted"
                              }
                            >
                              {transaction.type === "EARN"
                                ? copy.addBalance
                                : transaction.type === "REDEEM"
                                  ? copy.redeemReward
                                  : copy.adjustBalance}
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

                          <td className="px-6 py-4 font-semibold text-foreground-muted">
                            {transaction.balanceAfter}
                          </td>

                          <td className="px-6 py-4 text-foreground-muted">
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

          <aside className="h-fit rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground">{copy.topCustomers}</h2>

            <p className="mt-1 text-sm text-foreground-muted">
              {copy.topCustomersDetail}
            </p>

            <div className="mt-6 space-y-4">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  {copy.noCustomers}
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
                      className="flex items-center gap-4 rounded-2xl border border-border p-4 transition hover:border-primary/30 hover:bg-primary-soft"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-background">
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

                      <div className="text-end">
                        <p className="font-bold text-primary">
                          {customer.lifetimeEarned}
                        </p>

                        <p className="text-xs text-foreground-subtle">
                          {copy.balance}: {numberFormatter.format(customer.balance)}
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
