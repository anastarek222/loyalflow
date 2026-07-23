import { auth } from "@/auth";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

function getLoyaltyModeDescription(mode: string) {
  switch (mode) {
    case "VISITS":
      return "Customers earn points based on visits.";
    case "POINTS":
      return "Customers accumulate points for rewards.";
    case "SALES_AMOUNT":
      return "Loyalty based on total sales amount.";
    default:
      return "Unknown loyalty mode";
  }
}

export async function GET() {
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

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [
    business,
    totalCustomers,
    activeCustomers,
    newCustomersThisMonth,
    earnedTransactions,
    totalRedemptions,
    recentLoyaltyTransactions,
  ] = await Promise.all([
    prisma.business.findUnique({
      where: {
        id: businessId,
      },
      select: {
        loyaltyMode: true,
      },
    }),

    prisma.customer.count({
      where: {
        businessId,
      },
    }),

    prisma.customer.count({
      where: {
        businessId,
        isActive: true,
      },
    }),

    prisma.customer.count({
      where: {
        businessId,
        createdAt: {
          gte: monthStart,
        },
      },
    }),

    prisma.loyaltyTransaction.aggregate({
      where: {
        businessId,
        type: "EARN",
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.rewardRedemption.count({
      where: {
        businessId,
      },
    }),

    prisma.loyaltyTransaction.findMany({
      where: {
        businessId,
      },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  if (!business) {
    return NextResponse.json(
      { error: "Business not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    totalCustomers,
    activeCustomers,
    newCustomersThisMonth,
    totalEarnedAmount:
      earnedTransactions._sum.amount ?? 0,
    totalRedemptions,
    recentLoyaltyTransactions,
    loyaltyModeSummary: {
      mode: business.loyaltyMode,
      description:
        getLoyaltyModeDescription(
          business.loyaltyMode
        ),
    },
  });
}
