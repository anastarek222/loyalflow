import { LoyaltyMode, TransactionType } from "@/generated/prisma/client";
import prisma from "../prisma";

export const getBusinessAnalytics = async (businessId: string) => {
  const [
    totalCustomers,
    activeCustomers,
    newCustomersThisMonth,
    earnedTransactions,
    totalRedemptions,
    recentLoyaltyTransactions,
  ] = await prisma.$transaction([
    // Total Customers
    prisma.customer.count({ where: { businessId } }),
    // Active Customers
    prisma.customer.count({ where: { businessId, isActive: true } }),
    // New Customers This Month
    prisma.customer.count({
      where: {
        businessId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        },
      },
    }),
    // Total Earned Amount
    prisma.loyaltyTransaction.aggregate({
      _sum: { amount: true },
      where: {
        businessId,
        type: TransactionType.EARN,
      },
    }),
    // Total Redemptions
    prisma.loyaltyTransaction.count({
      where: {
        businessId,
        type: TransactionType.REDEEM,
      },
    }),
    // Recent Loyalty Transactions (last 10)
    prisma.loyaltyTransaction.findMany({
      where: { businessId },
      take: 10,
      skip: 0,
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  // Loyalty Mode Summary
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { loyaltyMode: true },
  });

  if (!business) {
    return null;
  }

  return {
    totalCustomers,
    activeCustomers,
    newCustomersThisMonth,
    totalEarnedAmount: earnedTransactions._sum.amount ?? 0,
    totalRedemptions,
    recentLoyaltyTransactions,
    loyaltyModeSummary: {
      mode: business.loyaltyMode,
      description: getLoyaltyModeDescription(business.loyaltyMode),
    },
  };
};

const getLoyaltyModeDescription = (mode: LoyaltyMode) => {
  switch (mode) {
    case 'VISITS':
      return 'Customers earn points based on visits.';
    case 'POINTS':
      return 'Customers accumulate points for rewards.';
    case 'SALES_AMOUNT':
      return 'Loyalty based on total sales amount.';
    default:
      return 'Unknown loyalty mode';
  }
};
