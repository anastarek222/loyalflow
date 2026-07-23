import { auth } from "@/auth";
import {
  getDefaultUtcDateRange,
  parseUtcDateInput,
} from "@/lib/analytics/date-range";
import { createHistoricalAnalyticsTrends } from "@/lib/analytics/trends";
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
  const defaults = getDefaultUtcDateRange();

  const from =
    parseUtcDateInput(url.searchParams.get("from")) ??
    defaults.from;
  const to =
    parseUtcDateInput(url.searchParams.get("to"), true) ??
    defaults.to;

  if (from > to) {
    return NextResponse.json(
      { error: "The from date must be before the to date." },
      { status: 400 }
    );
  }

  const dateRange = {
    gte: from,
    lte: to,
  };

  try {
    const [customers, loyaltyEarned, rewardsRedeemed] = await Promise.all([
      prisma.customer.findMany({
        where: {
          businessId,
          createdAt: dateRange,
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
          createdAt: dateRange,
        },
        select: {
          createdAt: true,
          amount: true,
        },
      }),
      prisma.rewardRedemption.findMany({
        where: {
          businessId,
          createdAt: dateRange,
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
