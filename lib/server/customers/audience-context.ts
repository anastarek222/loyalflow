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
import {
  getRedeemableCatalogueRewards,
  type RewardAvailabilityOption,
} from "@/lib/rewards/availability";
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

  const [transactions, rewardUnlocks, expiringRewards] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
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
    }),
    prisma.rewardUnlock.findMany({
      where: {
        businessId: input.business.id,
        customerId: { in: customerIds },
        redeemedAt: null,
      },
      select: {
        customerId: true,
        rewardId: true,
        expiresAt: true,
        redeemedAt: true,
        expiredAt: true,
      },
    }),
    prisma.reward.findMany({
      where: {
        businessId: input.business.id,
        isActive: true,
        expiresAfterDays: { gt: 0 },
      },
      select: { id: true },
    }),
  ]);

  const transactionsByCustomer = new Map<string, (typeof transactions)[number][]>();
  for (const transaction of transactions) {
    const existing = transactionsByCustomer.get(transaction.customerId) ?? [];
    existing.push(transaction);
    transactionsByCustomer.set(transaction.customerId, existing);
  }

  const unlocksByCustomer = new Map<string, (typeof rewardUnlocks)[number][]>();
  for (const unlock of rewardUnlocks) {
    const existing = unlocksByCustomer.get(unlock.customerId) ?? [];
    existing.push(unlock);
    unlocksByCustomer.set(unlock.customerId, existing);
  }

  const expiringRewardIds = new Set(expiringRewards.map((reward) => reward.id));
  const catalogueRewards = input.catalogueRewards.map((reward) => ({
    ...reward,
    expiresAfterDays: expiringRewardIds.has(reward.id) ? 1 : null,
  }));

  for (const customer of input.customers) {
    const context = resolveCustomerAudienceContext({
      loyaltyMode: input.business.loyaltyMode,
      customerActive: customer.isActive,
      balance: customer.balance,
      rewardThreshold: input.business.rewardThreshold,
      rewardName: input.business.rewardName,
      catalogueRewards,
      transactions: transactionsByCustomer.get(customer.id) ?? [],
      now,
    });

    if (catalogueRewards.length > 0) {
      context.rewardReady = getRedeemableCatalogueRewards({
        customerActive: customer.isActive,
        balance: customer.balance,
        catalogueRewards,
        rewardUnlocks: unlocksByCustomer.get(customer.id) ?? [],
        now,
      }).length > 0;
    }

    contexts.set(customer.id, context);
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
      select: {
        id: true,
        name: true,
        cost: true,
        isActive: true,
        expiresAfterDays: true,
      },
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
