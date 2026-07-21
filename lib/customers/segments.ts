import type { Prisma } from "@/generated/prisma/client";
import type { LoyaltyMode } from "@/generated/prisma/client";

export const customerSegments = [
  "NEW",
  "ACTIVE",
  "VIP",
  "AT_RISK",
  "INACTIVE",
  "REWARD_READY",
  "HIGH_SPENDER",
  "FREQUENT_VISITOR",
] as const;

export type CustomerSegment =
  (typeof customerSegments)[number];

type CustomerSegmentInput = {
  isActive: boolean;
  createdAt: Date;
  lastActivityAt: Date | null;
  lifetimeEarned: number;
  rewardThreshold: number;
};

const NEW_CUSTOMER_DAYS = 30;
const ACTIVE_CUSTOMER_DAYS = 30;
const AT_RISK_CUSTOMER_DAYS = 60;
const VIP_REWARD_CYCLES = 5;
const HIGH_SPENDER_REWARD_CYCLES = 10;
const FREQUENT_VISITOR_EARN_EVENTS = 10;

function daysAgo(days: number, now: Date) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function getVipThreshold(rewardThreshold: number) {
  return Math.max(1, rewardThreshold) * VIP_REWARD_CYCLES;
}

function getHighSpenderThreshold(rewardThreshold: number) {
  return Math.max(1, rewardThreshold) *
    HIGH_SPENDER_REWARD_CYCLES;
}

function getFrequentVisitorThreshold(earnAmount: number) {
  return Math.max(1, earnAmount) *
    FREQUENT_VISITOR_EARN_EVENTS;
}

export function getCustomerFilterSegments(
  loyaltyMode: LoyaltyMode
) {
  return customerSegments.filter((segment) => {
    if (segment === "HIGH_SPENDER") {
      return loyaltyMode === "SALES_AMOUNT";
    }

    if (segment === "FREQUENT_VISITOR") {
      return loyaltyMode !== "SALES_AMOUNT";
    }

    return true;
  });
}

export function getCustomerSegment(
  customer: CustomerSegmentInput,
  now = new Date()
): CustomerSegment {
  if (!customer.isActive) {
    return "INACTIVE";
  }

  const newCustomerSince = daysAgo(NEW_CUSTOMER_DAYS, now);

  if (customer.createdAt >= newCustomerSince) {
    return "NEW";
  }

  if (
    customer.lifetimeEarned >=
    getVipThreshold(customer.rewardThreshold)
  ) {
    return "VIP";
  }

  const lastActivityAt =
    customer.lastActivityAt ?? customer.createdAt;

  if (lastActivityAt >= daysAgo(ACTIVE_CUSTOMER_DAYS, now)) {
    return "ACTIVE";
  }

  if (lastActivityAt >= daysAgo(AT_RISK_CUSTOMER_DAYS, now)) {
    return "AT_RISK";
  }

  return "INACTIVE";
}

export function getCustomerSegmentWhere(
  segment: CustomerSegment,
  rewardThreshold: number,
  now = new Date(),
  earnAmount = 1
): Prisma.CustomerWhereInput {
  const newCustomerSince = daysAgo(NEW_CUSTOMER_DAYS, now);
  const activeCustomerSince = daysAgo(ACTIVE_CUSTOMER_DAYS, now);
  const atRiskCustomerSince = daysAgo(AT_RISK_CUSTOMER_DAYS, now);
  const vipThreshold = getVipThreshold(rewardThreshold);
  const highSpenderThreshold = getHighSpenderThreshold(
    rewardThreshold
  );
  const frequentVisitorThreshold = getFrequentVisitorThreshold(
    earnAmount
  );

  switch (segment) {
    case "NEW":
      return {
        isActive: true,
        createdAt: {
          gte: newCustomerSince,
        },
      };
    case "VIP":
      return {
        isActive: true,
        createdAt: {
          lt: newCustomerSince,
        },
        lifetimeEarned: {
          gte: vipThreshold,
        },
      };
    case "ACTIVE":
      return {
        isActive: true,
        createdAt: {
          lt: newCustomerSince,
        },
        lifetimeEarned: {
          lt: vipThreshold,
        },
        transactions: {
          some: {
            createdAt: {
              gte: activeCustomerSince,
            },
          },
        },
      };
    case "AT_RISK":
      return {
        isActive: true,
        createdAt: {
          lt: newCustomerSince,
        },
        lifetimeEarned: {
          lt: vipThreshold,
        },
        transactions: {
          none: {
            createdAt: {
              gte: activeCustomerSince,
            },
          },
          some: {
            createdAt: {
              gte: atRiskCustomerSince,
            },
          },
        },
      };
    case "INACTIVE":
      return {
        OR: [
          {
            isActive: false,
          },
          {
            isActive: true,
            createdAt: {
              lt: newCustomerSince,
            },
            lifetimeEarned: {
              lt: vipThreshold,
            },
            transactions: {
              none: {
                createdAt: {
                  gte: atRiskCustomerSince,
                },
              },
            },
          },
        ],
      };
    case "REWARD_READY":
      return {
        isActive: true,
        balance: {
          gte: Math.max(1, rewardThreshold),
        },
      };
    case "HIGH_SPENDER":
      return {
        isActive: true,
        lifetimeEarned: {
          gte: highSpenderThreshold,
        },
      };
    case "FREQUENT_VISITOR":
      return {
        isActive: true,
        lifetimeEarned: {
          gte: frequentVisitorThreshold,
        },
      };
  }
}

export function getCustomerSegmentLabel(
  segment: CustomerSegment
) {
  switch (segment) {
    case "NEW":
      return "جديد";
    case "ACTIVE":
      return "نشط";
    case "VIP":
      return "VIP";
    case "AT_RISK":
      return "معرّض للتوقف";
    case "INACTIVE":
      return "غير نشط";
    case "REWARD_READY":
      return "مكافأة جاهزة";
    case "HIGH_SPENDER":
      return "إنفاق مرتفع";
    case "FREQUENT_VISITOR":
      return "زائر متكرر";
  }
}
