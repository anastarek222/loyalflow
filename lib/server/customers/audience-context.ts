import type { LoyaltyMode } from "@/generated/prisma/client";
import {
  getFrequentVisitorWindowStart,
  resolveCustomerAudienceContext,
} from "@/lib/customers/audience-context";
import {
  customerMatchesSegment,
  type CustomerSegment,
  type CustomerSegmentContext,
} from "@/lib/customers/segments";
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

/**
 * Resolve the current membership of one segment using the same lifecycle and
 * trait authority used by Offers and other audience consumers. This intentionally
 * returns IDs so consumers can keep their existing scoped/report queries while
 * removing legacy lifetimeEarned approximations from audience selection.
 */
export async function resolveBusinessCustomerIdsForSegment(input: {
  business: AudienceBusiness;
  segment: CustomerSegment;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const [customers, catalogueRewards] = await Promise.all([
    prisma.customer.findMany({
      where: { businessId: input.business.id },
      select: {
        id: true,
        isActive: true,
        balance: true,
        lifetimeEarned: true,
        createdAt: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    prisma.reward.findMany({
      where: { businessId: input.business.id, isActive: true },
      select: { id: true, name: true, cost: true, isActive: true },
    }),
  ]);

  const contexts = await resolveBusinessCustomerAudienceContexts({
    business: input.business,
    customers,
    catalogueRewards,
    now,
  });

  return customers
    .filter((customer) =>
      customerMatchesSegment(
        input.segment,
        {
          isActive: customer.isActive,
          createdAt: customer.createdAt,
          lastActivityAt: customer.transactions[0]?.createdAt ?? null,
          lifetimeEarned: customer.lifetimeEarned,
          rewardThreshold: input.business.rewardThreshold,
        },
        contexts.get(customer.id) ?? {},
        now,
      ),
    )
    .map((customer) => customer.id);
}
