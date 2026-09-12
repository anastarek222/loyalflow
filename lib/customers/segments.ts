import type { LoyaltyMode, Prisma } from "@/generated/prisma/client";
import type { AppLanguage } from "@/lib/i18n";

export const customerLifecycleSegments = [
  "NEW",
  "ACTIVE",
  "AT_RISK",
  "INACTIVE",
] as const;

export const customerTraitSegments = [
  "VIP",
  "REWARD_READY",
  "HIGH_SPENDER",
  "FREQUENT_VISITOR",
] as const;

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

export type CustomerLifecycleSegment =
  (typeof customerLifecycleSegments)[number];
export type CustomerTraitSegment =
  (typeof customerTraitSegments)[number];
export type CustomerSegment = (typeof customerSegments)[number];

type CustomerSegmentInput = {
  isActive: boolean;
  createdAt: Date;
  lastActivityAt: Date | null;
  lifetimeEarned: number;
  rewardThreshold: number;
};

export type CustomerSegmentContext = {
  /** Canonical Reward Truth resolved by the caller. */
  rewardReady?: boolean;
  /** Net qualifying sales after voids/refunds. */
  netQualifyingSales?: number;
  /** Explicit product threshold for HIGH_SPENDER. */
  highSpenderThreshold?: number;
  /** Qualifying visit/earn-event count for the caller's documented period. */
  qualifyingVisitCount?: number;
  /** Explicit product threshold for FREQUENT_VISITOR. */
  frequentVisitorThreshold?: number;
};

const NEW_CUSTOMER_DAYS = 30;
const ACTIVE_CUSTOMER_DAYS = 30;
const AT_RISK_CUSTOMER_DAYS = 60;

/** VIP means at least five lifetime reward cycles earned. */
export const VIP_REWARD_CYCLES = 5;

// These remain only for the legacy Prisma filter while audience consumers are
// migrated to the dimensioned resolver. They must not be used as Product Truth.
const LEGACY_HIGH_SPENDER_REWARD_CYCLES = 10;
const LEGACY_FREQUENT_VISITOR_EARN_EVENTS = 10;

function daysAgo(days: number, now: Date) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function getVipThreshold(rewardThreshold: number) {
  return Math.max(1, rewardThreshold) * VIP_REWARD_CYCLES;
}

function getLegacyHighSpenderThreshold(rewardThreshold: number) {
  return Math.max(1, rewardThreshold) * LEGACY_HIGH_SPENDER_REWARD_CYCLES;
}

function getLegacyFrequentVisitorThreshold(earnAmount: number) {
  return Math.max(1, earnAmount) * LEGACY_FREQUENT_VISITOR_EARN_EVENTS;
}

export function getCustomerFilterSegments(loyaltyMode: LoyaltyMode) {
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

/** Activity lifecycle is intentionally independent from value/reward traits. */
export function getCustomerLifecycleSegment(
  customer: Pick<
    CustomerSegmentInput,
    "isActive" | "createdAt" | "lastActivityAt"
  >,
  now = new Date(),
): CustomerLifecycleSegment {
  if (!customer.isActive) return "INACTIVE";

  const newCustomerSince = daysAgo(NEW_CUSTOMER_DAYS, now);
  if (customer.createdAt >= newCustomerSince) return "NEW";

  const lastActivityAt = customer.lastActivityAt ?? customer.createdAt;
  if (lastActivityAt >= daysAgo(ACTIVE_CUSTOMER_DAYS, now)) return "ACTIVE";
  if (lastActivityAt >= daysAgo(AT_RISK_CUSTOMER_DAYS, now)) return "AT_RISK";
  return "INACTIVE";
}

/**
 * Resolve independent customer traits. Financial/visit traits require metrics
 * from an authoritative caller instead of inferring them from loyalty points.
 */
export function getCustomerTraits(
  customer: Pick<CustomerSegmentInput, "lifetimeEarned" | "rewardThreshold">,
  context: CustomerSegmentContext = {},
): CustomerTraitSegment[] {
  const traits: CustomerTraitSegment[] = [];

  if (customer.lifetimeEarned >= getVipThreshold(customer.rewardThreshold)) {
    traits.push("VIP");
  }

  if (context.rewardReady === true) {
    traits.push("REWARD_READY");
  }

  if (
    context.netQualifyingSales !== undefined &&
    context.highSpenderThreshold !== undefined &&
    context.highSpenderThreshold > 0 &&
    context.netQualifyingSales >= context.highSpenderThreshold
  ) {
    traits.push("HIGH_SPENDER");
  }

  if (
    context.qualifyingVisitCount !== undefined &&
    context.frequentVisitorThreshold !== undefined &&
    context.frequentVisitorThreshold > 0 &&
    context.qualifyingVisitCount >= context.frequentVisitorThreshold
  ) {
    traits.push("FREQUENT_VISITOR");
  }

  return traits;
}

export function customerMatchesSegment(
  segment: CustomerSegment,
  customer: CustomerSegmentInput,
  context: CustomerSegmentContext = {},
  now = new Date(),
) {
  if ((customerLifecycleSegments as readonly string[]).includes(segment)) {
    return getCustomerLifecycleSegment(customer, now) === segment;
  }

  return getCustomerTraits(customer, context).includes(
    segment as CustomerTraitSegment,
  );
}

/**
 * Compatibility projection for surfaces that still render one primary badge.
 * Audience decisions must use customerMatchesSegment/getCustomerTraits instead.
 */
export function getCustomerSegment(
  customer: CustomerSegmentInput,
  now = new Date(),
): CustomerSegment {
  const lifecycle = getCustomerLifecycleSegment(customer, now);
  if (lifecycle === "NEW" || lifecycle === "INACTIVE") return lifecycle;

  if (getCustomerTraits(customer).includes("VIP")) return "VIP";
  return lifecycle;
}

/**
 * Legacy Prisma-only filter kept while relational audience metrics are migrated.
 * HIGH_SPENDER/FREQUENT_VISITOR are not authoritative here; new audience code
 * must resolve them from net sales / qualifying visits and customerMatchesSegment.
 */
export function getCustomerSegmentWhere(
  segment: CustomerSegment,
  rewardThreshold: number,
  now = new Date(),
  earnAmount = 1,
): Prisma.CustomerWhereInput {
  const newCustomerSince = daysAgo(NEW_CUSTOMER_DAYS, now);
  const activeCustomerSince = daysAgo(ACTIVE_CUSTOMER_DAYS, now);
  const atRiskCustomerSince = daysAgo(AT_RISK_CUSTOMER_DAYS, now);
  const vipThreshold = getVipThreshold(rewardThreshold);
  const highSpenderThreshold = getLegacyHighSpenderThreshold(rewardThreshold);
  const frequentVisitorThreshold = getLegacyFrequentVisitorThreshold(earnAmount);

  switch (segment) {
    case "NEW":
      return {
        isActive: true,
        createdAt: { gte: newCustomerSince },
      };
    case "VIP":
      return {
        isActive: true,
        lifetimeEarned: { gte: vipThreshold },
      };
    case "ACTIVE":
      return {
        isActive: true,
        createdAt: { lt: newCustomerSince },
        transactions: {
          some: { createdAt: { gte: activeCustomerSince } },
        },
      };
    case "AT_RISK":
      return {
        isActive: true,
        createdAt: { lt: newCustomerSince },
        transactions: {
          none: { createdAt: { gte: activeCustomerSince } },
          some: { createdAt: { gte: atRiskCustomerSince } },
        },
      };
    case "INACTIVE":
      return {
        OR: [
          { isActive: false },
          {
            isActive: true,
            createdAt: { lt: newCustomerSince },
            transactions: {
              none: { createdAt: { gte: atRiskCustomerSince } },
            },
          },
        ],
      };
    case "REWARD_READY":
      return {
        isActive: true,
        balance: { gte: Math.max(1, rewardThreshold) },
      };
    case "HIGH_SPENDER":
      return {
        isActive: true,
        lifetimeEarned: { gte: highSpenderThreshold },
      };
    case "FREQUENT_VISITOR":
      return {
        isActive: true,
        lifetimeEarned: { gte: frequentVisitorThreshold },
      };
  }
}

export function getCustomerSegmentLabel(
  segment: CustomerSegment,
  language: AppLanguage = "AR",
) {
  if (language === "EN") {
    switch (segment) {
      case "NEW": return "New";
      case "ACTIVE": return "Active";
      case "VIP": return "VIP";
      case "AT_RISK": return "At risk";
      case "INACTIVE": return "Inactive";
      case "REWARD_READY": return "Reward ready";
      case "HIGH_SPENDER": return "High spender";
      case "FREQUENT_VISITOR": return "Frequent visitor";
    }
  }

  switch (segment) {
    case "NEW": return "جديد";
    case "ACTIVE": return "نشط";
    case "VIP": return "VIP";
    case "AT_RISK": return "معرّض للتوقف";
    case "INACTIVE": return "غير نشط";
    case "REWARD_READY": return "مكافأة جاهزة";
    case "HIGH_SPENDER": return "إنفاق مرتفع";
    case "FREQUENT_VISITOR": return "زائر متكرر";
  }
}
