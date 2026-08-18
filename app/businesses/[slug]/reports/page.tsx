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
  const locale = getLanguageLocale(language);
  const numberFormatter = new Intl.NumberFormat(locale);
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
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

  const advancedMetrics = [
    {
      label: t("إجمالي العملاء", "Total customers"),
      value: numberFormatter.format(totalCustomers),
      detail: segment
        ? t(
            `ضمن شريحة ${getCustomerSegmentLabel(segment, language)}`,
            `Within the ${getCustomerSegmentLabel(segment, language)} segment`,
          )
        : t("كل العملاء المسجلين", "All registered customers"),
      tone: "default",
    },
    {
      label: t("العملاء الجدد", "New customers"),
      value: numberFormatter.format(newCustomers),
      detail: t("تم تسجيلهم خلال الفترة المحددة", "Registered in the selected period"),
      tone: "default",
    },
    {
      label: t("العملاء النشطون", "Active customers"),
      value: numberFormatter.format(activeCustomerGroups.length),
      detail: t("عملاء لديهم حركات ولاء", "Customers with loyalty activity"),
      tone: "default",
    },
    {
      label: t("العملاء غير النشطين", "Inactive customers"),
      value: numberFormatter.format(inactiveCustomers),
      detail: t("حسب قاعدة عدم النشاط الحالية", "Based on the current inactivity rule"),
      tone: "default",
    },
    {
      label: t("عملاء معرّضون للتوقف", "Customers at risk"),
      value: numberFormatter.format(atRiskCustomers),
      detail: t(
        "توقف نشاطهم مؤخرًا ويحتاجون متابعة",
        "Recent loyalty activity has stopped and needs follow-up",
      ),
      tone: "danger",
    },
    {
      label: t("الحركات", "Operations"),
      value: numberFormatter.format(transactionCount),
      detail: t("عمليات الإضافة والاستبدال", "Earn and redemption activity"),
      tone: "default",
    },
    {
      label: t("رصيد الولاء المكتسب", "Loyalty earned"),
      value: formatLoyaltyAmount({
        ...loyaltyPresentation,
        amount: earnedAmount,
      }),
      detail: t(
        `${earned._count._all} عملية إضافة — ${operationalUnitLabel(loyaltyPresentation)}`,
        `${numberFormatter.format(earned._count._all)} earn actions — ${operationalUnitLabel(loyaltyPresentation)}`,
      ),
      tone: "success",
    },
    {
      label: t("إجمالي الولاء المكتسب", "Lifetime loyalty earned"),
      value: formatLoyaltyAmount({
        ...loyaltyPresentation,
        amount: lifetimeEarnedAmount,
      }),
      detail: t(
        `${allTimeEarned._count._all} عملية إضافة منذ بداية البرنامج`,
        `${numberFormatter.format(allTimeEarned._count._all)} earn actions since programme start`,
      ),
      tone: "success",
    },
    ...(business.loyaltyMode === "SALES_AMOUNT" && business.currency
      ? [
          {
            label: t("إجمالي الإنفاق المسجل", "Total recorded sales"),
            value: formatLoyaltyAmount({
              ...loyaltyPresentation,
              amount: lifetimeTrackedSalesAmount,
            }),
            detail: t(
              "محسوب فقط من عمليات البيع المسجلة في LoyalFlow",
              "Calculated only from sales recorded in LoyalFlow",
            ),
            tone: "success",
          },
        ]
      : []),
    ...(business.loyaltyMode === "VISITS"
      ? [
          {
            label: t("إجمالي الزيارات", "Total visits"),
            value: numberFormatter.format(allTimeVisitCount),
            detail: t(
              "كل عمليات الإضافة المسجلة كزيارة",
              "All earn actions recorded as visits",
            ),
            tone: "default",
          },
        ]
      : []),
    {
      label: t("متوسط الوقت لأول مكافأة", "Average time to first reward"),
      value:
        averageDaysToFirstReward === null
          ? "—"
          : t(
              `${averageDaysToFirstReward.toFixed(1)} يوم`,
              `${averageDaysToFirstReward.toFixed(1)} days`,
            ),
      detail: t(
        "من إنشاء العميل حتى أول استبدال",
        "From customer creation to first redemption",
      ),
      tone: "default",
    },
    ...(business.loyaltyMode === "SALES_AMOUNT" && business.currency
      ? [
          {
            label: t("متوسط قيمة الشراء", "Average purchase value"),
            value: `${averagePurchaseAmount.toFixed(1)} ${business.currency}`,
            detail: t(
              "متوسط عمليات الشراء المؤهلة خلال الفترة",
              "Average eligible purchases in the selected period",
            ),
            tone: "default",
          },
        ]
      : []),
    ...(business.loyaltyMode === "VISITS"
      ? [
          {
            label: t("متوسط الأيام بين الزيارات", "Average days between visits"),
            value:
              averageDaysBetweenVisits === null
                ? "—"
                : t(
                    `${averageDaysBetweenVisits.toFixed(1)} يوم`,
                    `${averageDaysBetweenVisits.toFixed(1)} days`,
                  ),
            detail: t(
              "بين الزيارات المسجلة خلال الفترة المحددة",
              "Between visits recorded in the selected period",
            ),
            tone: "default",
          },
        ]
      : []),
    {
      label: t("المكافآت المستبدلة", "Rewards redeemed"),
      value: numberFormatter.format(redeemed._count._all),
      detail: t(
        `إجمالي التكلفة خلال الفترة: ${redeemedCost} — الإجمالي منذ البداية: ${allTimeRedeemed._count._all}`,
        `Cost in period: ${numberFormatter.format(redeemedCost)} — lifetime total: ${numberFormatter.format(allTimeRedeemed._count._all)}`,
      ),
      tone: "warning",
    },
    {
      label: t("مكافآت فُتحت", "Rewards unlocked"),
      value: numberFormatter.format(rewardUnlocks),
      detail: t(
        "مقياس على مستوى النشاط؛ لا يحمل فتح المكافأة فرعًا أو موظفًا في السجل الحالي.",
        "Business-wide metric; unlock records currently do not carry branch or staff attribution.",
      ),
      tone: "primary",
    },
    {
      label: t("أرصدة العملاء الحالية", "Current customer balances"),
      value: formatLoyaltyAmount({
        ...loyaltyPresentation,
        amount: currentBalance,
      }),
      detail: t(
        `إجمالي ${operationalUnitLabel(loyaltyPresentation)} المتاحة`,
        `Total available ${operationalUnitLabel(loyaltyPresentation)}`,
      ),
      tone: "primary",
    },
    {
      label: t("العملاء العائدون", "Returning customers"),
      value: numberFormatter.format(returningCustomers),
      detail: t(
        "عميل لديه عمليتا إضافة أو أكثر خلال الفترة",
        "Customers with two or more earn actions in the period",
      ),
      tone: "default",
    },
    {
      label: t("معدل تكرار العملاء", "Repeat customer rate"),
      value: `${repeatCustomerRate.toFixed(1)}%`,
      detail: t(
        "العملاء ذوو عمليتي إضافة أو أكثر من العملاء النشطين بالولاء",
        "Customers with two or more earn actions among loyalty-active customers",
      ),
      tone: "default",
    },
    {
      label: t("العملاء المستعادون", "Recovered customers"),
      value: numberFormatter.format(recoveredCustomers),
      detail: t("حسابات أعيد تفعيلها خلال الفترة", "Accounts reactivated in the period"),
      tone: "success",
    },
    {
      label: t("متوسط نشاط الولاء", "Average loyalty activity"),
      value: averageLoyaltyActivity.toFixed(1),
      detail: t("عمليات إضافة لكل عميل نشط", "Earn actions per active customer"),
      tone: "default",
    },
    {
      label: t("معدل استبدال المكافآت", "Reward redemption rate"),
      value: `${redemptionRate.toFixed(1)}%`,
      detail: t("نسبة الاستبدالات إلى عمليات الإضافة", "Redemptions as a share of earn actions"),
      tone: "default",
    },
  ];

  const impactMetrics = [
    {
      label: t("عملاء عائدون", "Returning customers"),
      value: numberFormatter.format(returningCustomers),
      detail: t("عمليتا إضافة أو أكثر خلال الفترة", "Two or more earn actions in the period"),
    },
    {
      label: t("عملاء مستعادون", "Recovered customers"),
      value: numberFormatter.format(recoveredCustomers),
      detail: t("حسابات أعيد تفعيلها خلال الفترة", "Accounts reactivated in the period"),
    },
    {
      label: t("حركات ولاء مسجلة", "Recorded loyalty operations"),
      value: numberFormatter.format(transactionCount),
      detail: t(
        "إضافة، استبدال، أو تعديل ضمن الفترة",
        "Earn, redemption, or adjustment activity in the period",
      ),
    },
    {
      label: t("مكافآت مستبدلة", "Rewards redeemed"),
      value: numberFormatter.format(redeemed._count._all),
      detail: t("استبدالات مسجلة خلال الفترة", "Redemptions recorded in the period"),
    },
    {
      label: t("معدل تكرار العملاء", "Repeat customer rate"),
      value: `${repeatCustomerRate.toFixed(1)}%`,
      detail: t("من العملاء ذوي نشاط الولاء", "Among customers with loyalty activity"),
    },
    ...(business.loyaltyMode === "SALES_AMOUNT" && business.currency
      ? [
          {
            label: t("مبيعات ولاء مسجلة", "Recorded loyalty sales"),
            value: `${numberFormatter.format(trackedSalesAmount)} ${business.currency}`,
            detail: t(
              "مبيعات أدخلها الموظفون خلال الفترة، وليست إسنادًا تسويقيًا",
              "Sales entered by staff in the period; this is not marketing attribution",
            ),
          },
        ]
      : []),
  ];

  const rankings = [
    {
      title: t("الأكثر نشاطًا", "Most active"),
      description: t(
        "حسب كل حركات الولاء خلال الفترة.",
        "By all loyalty operations in the selected period.",
      ),
      items: mostActiveCustomers,
      suffix: t("حركة", "operations"),
    },
    {
      title: t("أعلى قيمة مكتسبة", "Highest earned value"),
      description: t(
        "حسب الرصيد المكتسب خلال الفترة.",
        "By loyalty earned in the selected period.",
      ),
      items: highestValueEarnedCustomers,
      suffix: business.unitName,
    },
    {
      title: t("الأكثر استبدالًا", "Most redemptions"),
      description: t(
        "حسب المكافآت المستبدلة خلال الفترة.",
        "By rewards redeemed in the selected period.",
      ),
      items: mostRedeemedCustomers,
      suffix: t("مكافأة", "rewards"),
    },
  ];

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
          {t("العودة إلى", "Back to")} {business.name}
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
                {t("التقارير والتحليلات", "Reports & analytics")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-foreground-muted">
                {t(
                  "اقرأ أداء برنامج الولاء من السجل الفعلي، مع فصل واضح بين الرصيد والمبيعات والاستبدالات.",
                  "Read loyalty performance from the actual ledger, with a clear separation between balances, sales, and redemptions.",
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="rounded-[var(--lf-radius-input)] border border-border bg-surface/90 px-4 py-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-foreground-subtle">
                  <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                  {t("الفترة", "Period")}
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
                  {t("طريقة العرض", "View mode")}
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
          aria-label={t("إجراءات التقارير", "Report actions")}
          className="mt-5 flex flex-wrap gap-2"
        >
          <Link
            href={`/businesses/${business.slug}/reports/staff?${reportQuery}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-bold text-foreground-muted transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Users className="size-4" aria-hidden="true" />
            {t("أداء الموظفين", "Staff performance")}
          </Link>

          {canExportData && (
            <a
              href={`/businesses/${business.slug}/reports/export?${reportQuery}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-900 transition-colors hover:bg-emerald-100"
            >
              <Download className="size-4" aria-hidden="true" />
              {t("تصدير حركات الفترة CSV", "Export period activity CSV")}
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
                  {t("الفترة ونطاق التقرير", "Period & report scope")}
                </span>
                <span className="mt-0.5 block text-xs text-foreground-subtle">
                  {t(
                    "غيّر التاريخ أو الشريحة أو الفرع أو الموظف عند الحاجة.",
                    "Change dates, segment, branch, or staff when needed.",
                  )}
                </span>
              </span>
            </span>
            <span className="text-xs font-bold text-primary">
              {t("تعديل", "Edit")}
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
                {t("من تاريخ", "From date")}
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
                {t("شريحة العملاء", "Customer segment")}
              </label>
              <select
                id="segment"
                name="segment"
                defaultValue={segment ?? "all"}
                className={reportFieldClass}
              >
                <option value="all">{t("كل الشرائح", "All segments")}</option>
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
                {t("برنامج الولاء", "Loyalty programme")}
              </label>
              <select
                id="loyaltyMode"
                name="loyaltyMode"
                defaultValue={loyaltyMode}
                className={reportFieldClass}
              >
                <option value="all">
                  {t("كل البرامج المتاحة", "All available programmes")}
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
                {t("إلى تاريخ", "To date")}
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
                {t("الفرع", "Branch")}
              </label>
              <select
                id="branch"
                name="branch"
                defaultValue={reportScope.branchId ?? "all"}
                className={reportFieldClass}
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
                className="mb-2 block text-sm font-medium text-foreground-muted"
              >
                {t("الموظف المنسوب إليه", "Attributed staff")}
              </label>
              <select
                id="staff"
                name="staff"
                defaultValue={reportScope.attributedStaffId ?? "all"}
                className={reportFieldClass}
              >
                <option value="all">
                  {t(
                    "كل الموظفين والعمليات غير المنسوبة",
                    "All staff and unattributed operations",
                  )}
                </option>
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
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-5 font-bold text-white transition-colors hover:bg-primary-hover sm:w-auto"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {copy.apply}
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
                  className={`inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border px-4 text-center text-sm font-bold transition-colors ${
                    period === shortcut
                      ? "border-primary bg-primary text-white"
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
              label: t("عملاء جدد", "New customers"),
              value: newCustomers,
              detail: t("خلال الفترة المحددة", "In the selected period"),
            },
            {
              icon: Sparkles,
              tone: "success",
              label: t("الولاء المكتسب", "Loyalty earned"),
              value: formatLoyaltyAmount({
                ...loyaltyPresentation,
                amount: earnedAmount,
              }),
              detail: t("رصيد ولاء مسجل", "Recorded loyalty balance"),
            },
            {
              icon: Gift,
              tone: "warning",
              label: t("استبدالات المكافآت", "Reward redemptions"),
              value: numberFormatter.format(redeemed._count._all),
              detail: t("استبدالات مسجلة", "Recorded redemptions"),
            },
            {
              icon: ShieldAlert,
              tone: "danger",
              label: t("عمليات عكس معلقة", "Unresolved reversals"),
              value: numberFormatter.format(openReversalExceptions),
              detail: t(
                "رصيد غير كافٍ ويحتاج متابعة",
                "Insufficient balance requires follow-up",
              ),
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
          aria-label={t("صافي عمليات الولاء", "Ledger gross and net summary")}
          data-ledger-summary="gross-reversal-net"
          className="mt-5 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <TrendingUp className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {t("سلامة السجل", "Ledger integrity")}
              </p>
              <h2 className="mt-1 text-lg font-black text-foreground">
                {t("الإجمالي والعكس والصافي", "Gross, reversals & net")}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground-muted">
                {t(
                  "الأرقام محسوبة من سجل الحركات للفترة والفلاتر الحالية بدون تعديل السجل التاريخي.",
                  "Calculated from the immutable ledger using the current period and filters.",
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
                {t("الولاء المكتسب", "Earned loyalty")}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>{t("الإجمالي", "Gross earned")}</dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...loyaltyPresentation,
                      amount: ledgerSummary.grossEarned,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{t("عمليات العكس", "Earn reversals")}</dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...loyaltyPresentation,
                      amount: ledgerSummary.earnReversed,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="font-bold">{t("الصافي", "Net earned")}</dt>
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
                {t("الاستبدالات", "Redemptions")}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>{t("إجمالي المستبدل", "Gross redeemed")}</dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...loyaltyPresentation,
                      amount: ledgerSummary.grossRedeemed,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{t("عكس الاستبدالات", "Redemption reversals")}</dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...loyaltyPresentation,
                      amount: ledgerSummary.redemptionReversed,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="font-bold">
                    {t("صافي المستبدل", "Net redeemed")}
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
                {t("المبيعات المسجلة", "Recorded sales")}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>{t("إجمالي المبيعات", "Gross recorded sales")}</dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...salesPresentation,
                      amount: ledgerSummary.grossRecordedSales,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{t("المبيعات المرتجعة", "Refunded sales")}</dt>
                  <dd className="font-semibold">
                    {formatLoyaltyAmount({
                      ...salesPresentation,
                      amount: ledgerSummary.refundedSales,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="font-bold">
                    {t("صافي المبيعات", "Net recorded sales")}
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
              {t("التعديلات اليدوية", "Manual adjustments")}: +
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
              {t("عمليات عكس معلقة", "Unresolved reversals")}: {numberFormatter.format(ledgerSummary.unresolvedExceptions)}
            </p>
            <p className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3 text-sm text-foreground-muted">
              {t("حركات عكس غير صالحة", "Invalid reversal rows")}: {numberFormatter.format(ledgerSummary.invalidReversalCount)}
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
          className={`${simple ? "hidden " : ""}mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3`}
          aria-label={t("مؤشرات التقرير المتقدمة", "Advanced report metrics")}
          data-report-advanced-metrics="true"
        >
          {advancedMetrics.map((metric) => {
            const valueClass =
              metric.tone === "success"
                ? "text-emerald-700"
                : metric.tone === "warning"
                  ? "text-amber-700"
                  : metric.tone === "danger"
                    ? "text-red-700"
                    : metric.tone === "primary"
                      ? "text-primary"
                      : "text-foreground";

            return (
              <article
                key={metric.label}
                className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5"
              >
                <p className="text-sm font-semibold text-foreground-subtle">
                  {metric.label}
                </p>
                <p className={`lf-type-numeric mt-2 text-3xl font-black ${valueClass}`}>
                  {metric.value}
                </p>
                <p dir="auto" className="mt-2 text-xs leading-5 text-foreground-muted">
                  {metric.detail}
                </p>
                {metric.label === t("المكافآت المستبدلة", "Rewards redeemed") &&
                  rewardDistribution.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-foreground-muted">
                      {rewardDistribution.map((reward) => (
                        <li key={reward.rewardName} dir="auto">
                          {reward.rewardName}: {numberFormatter.format(reward._count._all)}
                        </li>
                      ))}
                    </ul>
                  )}
              </article>
            );
          })}
        </section>

        <section
          className={`${simple ? "hidden " : ""}mt-6 rounded-[var(--lf-radius-card)] border border-border bg-foreground p-5 text-surface shadow-sm sm:p-7`}
          aria-label={t("أثر برنامج الولاء", "Loyalty programme impact")}
          data-report-impact="true"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black text-emerald-300">
                {t("أثر برنامج الولاء", "Loyalty programme impact")}
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {t("مؤشرات تشغيلية موثقة", "Documented operational signals")}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-surface/75">
              {t(
                "تعرض هذه المؤشرات ما سجله LoyalFlow فقط. لا تنسب إيرادًا أو عائدًا للبرنامج ما لم يكن مسجلاً صراحةً كعملية بيع.",
                "These metrics show only what LoyalFlow recorded. They do not attribute revenue or ROI to the programme unless it was explicitly recorded as a sale.",
              )}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {impactMetrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-[var(--lf-radius-input)] border border-surface/15 bg-surface/10 p-4"
              >
                <p className="text-sm text-surface/70">{metric.label}</p>
                <p className="lf-type-numeric mt-2 text-3xl font-black text-surface">
                  {metric.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-surface/70">
                  {metric.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          className={`${simple ? "hidden " : ""}mt-6 grid gap-4 lg:grid-cols-3`}
          aria-label={t("ترتيب العملاء", "Customer rankings")}
        >
          {rankings.map((ranking) => (
            <article
              key={ranking.title}
              className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm"
            >
              <h2 className="text-lg font-black text-foreground">
                {ranking.title}
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                {ranking.description}
              </p>

              <div className="mt-5 space-y-3">
                {ranking.items.length === 0 ? (
                  <p className="text-sm text-foreground-muted">{copy.noData}</p>
                ) : (
                  ranking.items.map(({ customer, value }, index) => (
                    <Link
                      key={customer.id}
                      href={`/businesses/${business.slug}/customers/${customer.id}`}
                      className="flex min-h-12 items-center gap-3 rounded-[var(--lf-radius-input)] border border-border p-3 transition-colors hover:border-primary/30 hover:bg-surface-subtle"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <span dir="auto" className="min-w-0 flex-1 truncate font-semibold text-foreground">
                        {getCustomerName(customer)}
                      </span>
                      <span dir="auto" className="text-sm font-bold text-primary">
                        {numberFormatter.format(value)} {ranking.suffix}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </article>
          ))}
        </section>

        <section
          className={`${simple ? "hidden " : ""}mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]`}
          aria-label={t("نشاط العملاء الأخير", "Recent customer activity")}
        >
          <div className="overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-5 sm:px-6">
              <h2 className="text-xl font-black text-foreground">
                {t("أحدث الحركات", "Recent activity")}
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                {t(
                  "أحدث 50 عملية خلال الفترة المحددة.",
                  "Latest 50 operations in the selected period.",
                )}
              </p>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-10 text-center text-foreground-muted">
                {t("لا توجد حركات خلال هذه الفترة.", "No activity in this period.")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-start text-sm">
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
                        : t("النظام", "System");

                      return (
                        <tr
                          key={transaction.id}
                          className="transition-colors hover:bg-surface-subtle/60"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/businesses/${business.slug}/customers/${transaction.customer.id}`}
                              className="font-semibold text-foreground transition-colors hover:text-primary"
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
                                  ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                                  : transaction.type === "REDEEM"
                                    ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                                    : "rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-foreground-muted"
                              }
                            >
                              {transaction.type === "EARN"
                                ? t("إضافة رصيد", "Earn balance")
                                : transaction.type === "REDEEM"
                                  ? t("استبدال مكافأة", "Reward redemption")
                                  : t("تعديل رصيد", "Balance adjustment")}
                            </span>
                          </td>

                          <td
                            className={`lf-type-numeric px-6 py-4 font-bold ${
                              transaction.amount >= 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {transaction.amount > 0 ? "+" : ""}
                            {numberFormatter.format(transaction.amount)}
                          </td>
                          <td className="lf-type-numeric px-6 py-4 font-semibold text-foreground">
                            {numberFormatter.format(transaction.balanceAfter)}
                          </td>
                          <td dir="auto" className="px-6 py-4 text-foreground-muted">
                            {employeeName}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-foreground-muted">
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

          <aside className="h-fit rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-foreground">
              {t("أفضل العملاء", "Top customers")}
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              {t(
                "الترتيب حسب إجمالي رصيد الولاء المكتسب.",
                "Ranked by lifetime loyalty earned.",
              )}
            </p>

            <div className="mt-5 space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  {t("لا يوجد عملاء حتى الآن.", "No customers yet.")}
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
                      className="flex items-center gap-4 rounded-[var(--lf-radius-input)] border border-border p-3 transition-colors hover:border-primary/30 hover:bg-surface-subtle"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p dir="auto" className="truncate font-semibold text-foreground">
                          {customerName}
                        </p>
                        <p className="mt-1 text-xs text-foreground-subtle">
                          {customer.customerCode}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="lf-type-numeric font-bold text-primary">
                          {numberFormatter.format(customer.lifetimeEarned)}
                        </p>
                        <p className="lf-type-numeric text-xs text-foreground-subtle">
                          {t("الرصيد", "Balance")} {numberFormatter.format(customer.balance)}
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
