import type { Prisma } from "@/generated/prisma/client";

export const RAPID_EARN_WINDOW_MS = 5_000;

export type RapidEarnInput = {
  businessId: string;
  customerId: string;
  createdById: string;
  amount: number;
};

export type RapidRedemptionInput = {
  businessId: string;
  customerId: string;
  createdById: string;
  cost: number;
};

export function getRapidEarnCutoff(now = new Date()) {
  return new Date(now.getTime() - RAPID_EARN_WINDOW_MS);
}

export function getRapidEarnRateLimitKey(input: RapidEarnInput) {
  return [
    "loyalty-earn",
    input.businessId,
    input.customerId,
    input.createdById,
    input.amount,
  ].join(":");
}

export function getRapidEarnWhere(
  input: RapidEarnInput,
  now = new Date()
): Prisma.LoyaltyTransactionWhereInput {
  return {
    customerId: input.customerId,
    businessId: input.businessId,
    createdById: input.createdById,
    type: "EARN",
    amount: input.amount,
    createdAt: {
      gte: getRapidEarnCutoff(now),
    },
  };
}

export function getRapidRedemptionRateLimitKey(
  input: RapidRedemptionInput
) {
  return [
    "reward-redemption",
    input.businessId,
    input.customerId,
    input.createdById,
    input.cost,
  ].join(":");
}

export function getRapidRedemptionWhere(
  input: RapidRedemptionInput,
  now = new Date()
): Prisma.LoyaltyTransactionWhereInput {
  return {
    customerId: input.customerId,
    businessId: input.businessId,
    createdById: input.createdById,
    type: "REDEEM",
    amount: -input.cost,
    createdAt: {
      gte: getRapidEarnCutoff(now),
    },
  };
}

export function isUnusualManualAdjustment(
  amount: number,
  rewardThreshold: number
) {
  return (
    Math.abs(amount) >=
    Math.max(1, rewardThreshold)
  );
}
