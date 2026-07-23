import { auth } from "@/auth";
import {
  parseReportDateRange,
} from "@/lib/analytics/date-range";
import { resolveReportScope } from "@/lib/analytics/report-filters";
import { createHistoricalAnalyticsTrends } from "@/lib/analytics/trends";
import {
  getCustomerFilterSegments,
  getCustomerSegmentWhere,
  type CustomerSegment,
} from "@/lib/customers/segments";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  const businessId = session?.user?.businessId;

  if (!businessId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canPerform(session.user, businessId, "REPORTS_VIEW")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const dateRange = parseReportDateRange({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!dateRange) {
    return NextResponse.json(
      { error: "Invalid report date range." },
      { status: 400 }
    );
  }
  const { from, to } = dateRange;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      loyaltyMode: true,
      rewardThreshold: true,
      earnAmount: true,
    },
  });
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const [branches, staff] = await Promise.all([
    prisma.branch.findMany({
      where: { businessId },
      select: { id: true, businessId: true, name: true, isActive: true },
    }),
    prisma.user.findMany({
      where: { businessId },
      select: { id: true, businessId: true },
    }),
  ]);
  const reportScope = resolveReportScope({
    businessId,
    branchId: url.searchParams.get("branch"),
    staffId: url.searchParams.get("staff"),
    branches,
    staff,
  });
  if (!reportScope) {
    return NextResponse.json({ error: "Invalid branch or staff filter." }, { status: 400 });
  }
  const requestedSegment = url.searchParams.get("segment");
  const availableSegments = getCustomerFilterSegments(business.loyaltyMode);
  const segment = availableSegments.includes(requestedSegment as CustomerSegment)
    ? requestedSegment as CustomerSegment
    : null;
  const customerWhere = segment
    ? {
        businessId,
        ...getCustomerSegmentWhere(
          segment,
          business.rewardThreshold,
          undefined,
          business.earnAmount,
        ),
      }
    : undefined;

  const createdAtRange = {
    gte: from,
    lte: to,
  };

  try {
    const [customers, loyaltyEarned, rewardsRedeemed] = await Promise.all([
      prisma.customer.findMany({
        where: {
          businessId,
          createdAt: createdAtRange,
          ...(customerWhere ?? {}),
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.loyaltyTransaction.findMany({
        where: {
          businessId,
          type: "EARN",
          createdAt: createdAtRange,
          ...reportScope,
          ...(customerWhere ? { customer: customerWhere } : {}),
        },
        select: {
          createdAt: true,
          amount: true,
        },
      }),
      prisma.rewardRedemption.findMany({
        where: {
          businessId,
          createdAt: createdAtRange,
          ...reportScope,
          ...(customerWhere ? { customer: customerWhere } : {}),
        },
        select: {
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      historicalTrends:
        createHistoricalAnalyticsTrends(
          {
            customers,
            loyaltyEarned,
            rewardsRedeemed,
          },
          from,
          to
        ),
    });
  } catch (error) {
    logServerError("historical_analytics_load_failed", error);

    return NextResponse.json(
      { error: "Unable to load historical analytics" },
      { status: 500 }
    );
  }
}
