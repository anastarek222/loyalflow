import type { LoyaltyMode } from "@/generated/prisma/client";
import {
  getFrequentVisitorWindowStart,
  resolveCustomerAudienceContext,
} from "@/lib/customers/audience-context";
import type { CustomerSegmentContext } from "@/lib/customers/segments";
import type { RewardAvailabilityOption } from "@/lib/rewards/availability";
import prisma from "@/lib/prisma";

type AudienceBusiness = {
  id: string;
  loyaltyMode: LoyaltyMode;
  rewardThreshold: number;
  rewardName: string;
};

type AudienceCustomer = {
  id: string;
  isActive: boolean;
  balance: number;
};

/**
 * Resolve segmentation metrics for many customers with one tenant-scoped ledger
 * query. Consumers must pass only customers already scoped to the same Business.
 */
export async function resolveBusinessCustomerAudienceContexts(input: {
  business: AudienceBusiness;
  customers: readonly AudienceCustomer[];
  catalogueRewards: readonly RewardAvailabilityOption[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const customerIds = input.customers.map((customer) => customer.id);
  const contexts = new Map<string, CustomerSegmentContext>();

  if (customerIds.length === 0) return contexts;

  const transactions = await prisma.loyaltyTransaction.findMany({
    where: {
      businessId: input.business.id,
      customerId: { in: customerIds },
      ...(input.business.loyaltyMode === "SALES_AMOUNT"
        ? {
            OR: [
              { type: "EARN" as const, saleAmount: { not: null } },
              {
                type: "REVERSAL" as const,
                reversalKind: { in: ["EARN_REFUND", "EARN_VOID"] as const },
                saleAmount: { not: null },
              },
            ],
          }
        : {
            type: "EARN" as const,
            createdAt: { gte: getFrequentVisitorWindowStart(now) },
            OR: [
              { sourceLoyaltyMode: input.business.loyaltyMode },
              { sourceLoyaltyMode: null },
            ],
          }),
    },
    select: {
      customerId: true,
      type: true,
      amount: true,
      saleAmount: true,
      reversalKind: true,
      sourceLoyaltyMode: true,
      createdAt: true,
    },
    orderBy: [{ customerId: "asc" }, { createdAt: "asc" }],
  });

  const transactionsByCustomer = new Map<
    string,
    (typeof transactions)[number][]
  >();

  for (const transaction of transactions) {
    const existing = transactionsByCustomer.get(transaction.customerId) ?? [];
    existing.push(transaction);
    transactionsByCustomer.set(transaction.customerId, existing);
  }

  for (const customer of input.customers) {
    contexts.set(
      customer.id,
      resolveCustomerAudienceContext({
        loyaltyMode: input.business.loyaltyMode,
        customerActive: customer.isActive,
        balance: customer.balance,
        rewardThreshold: input.business.rewardThreshold,
        rewardName: input.business.rewardName,
        catalogueRewards: input.catalogueRewards,
        transactions: transactionsByCustomer.get(customer.id) ?? [],
        now,
      }),
    );
  }

  return contexts;
}

export async function resolveBusinessCustomerAudienceContext(input: {
  business: AudienceBusiness;
  customer: AudienceCustomer;
  catalogueRewards: readonly RewardAvailabilityOption[];
  now?: Date;
}) {
  const contexts = await resolveBusinessCustomerAudienceContexts({
    business: input.business,
    customers: [input.customer],
    catalogueRewards: input.catalogueRewards,
    now: input.now,
  });

  return contexts.get(input.customer.id) ?? {};
}
