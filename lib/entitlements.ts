export const productFeatures = [
  "LOYALTY_CORE",
  "REWARDS",
  "PROMOTIONS",
  "OFFERS",
  "CAMPAIGNS",
  "REFERRALS",
  "REPORTING",
  "MULTI_BRANCH",
  "CUSTOMER_NOTES_TAGS",
  "CUSTOMER_BULK_OPERATIONS",
  "GOOGLE_WALLET_READINESS",
] as const;

export type ProductFeature = (typeof productFeatures)[number];

export const loyalFlowPlans = [
  "FREE",
  "STARTER",
  "PRO",
  "BUSINESS",
] as const;

export type LoyalFlowPlan = (typeof loyalFlowPlans)[number];

export const planResources = [
  "CUSTOMERS",
  "USERS",
  "BRANCHES",
  "OFFERS",
  "REWARDS",
] as const;

export type PlanResource = (typeof planResources)[number];

export type PlanLimits = Readonly<Record<PlanResource, number | null>>;

export type PlanDefinition = Readonly<{
  name: string;
  features: readonly ProductFeature[];
  limits: PlanLimits;
}>;

export const planCatalog: Record<LoyalFlowPlan, PlanDefinition> = {
  FREE: {
    name: "Free",
    features: ["LOYALTY_CORE", "REWARDS", "OFFERS"],
    limits: {
      CUSTOMERS: 100,
      USERS: 2,
      BRANCHES: 1,
      OFFERS: 1,
      REWARDS: 1,
    },
  },
  STARTER: {
    name: "Starter",
    features: [
      "LOYALTY_CORE",
      "REWARDS",
      "OFFERS",
      "REPORTING",
      "CUSTOMER_NOTES_TAGS",
    ],
    limits: {
      CUSTOMERS: 500,
      USERS: 5,
      BRANCHES: 1,
      OFFERS: 5,
      REWARDS: 5,
    },
  },
  PRO: {
    name: "Pro",
    features: [
      "LOYALTY_CORE",
      "REWARDS",
      "PROMOTIONS",
      "OFFERS",
      "CAMPAIGNS",
      "REFERRALS",
      "REPORTING",
      "MULTI_BRANCH",
      "CUSTOMER_NOTES_TAGS",
      "CUSTOMER_BULK_OPERATIONS",
    ],
    limits: {
      CUSTOMERS: 2500,
      USERS: 15,
      BRANCHES: 5,
      OFFERS: 25,
      REWARDS: 25,
    },
  },
  BUSINESS: {
    name: "Business",
    features: productFeatures,
    limits: {
      CUSTOMERS: null,
      USERS: null,
      BRANCHES: null,
      OFFERS: null,
      REWARDS: null,
    },
  },
};

export function isLoyalFlowPlan(value: string | null | undefined): value is LoyalFlowPlan {
  return loyalFlowPlans.includes(value as LoyalFlowPlan);
}

export function hasFeatureEntitlement(
  plan: LoyalFlowPlan,
  feature: ProductFeature,
) {
  return planCatalog[plan].features.includes(feature);
}

export function getPlanEntitlements(plan: LoyalFlowPlan) {
  return [...planCatalog[plan].features];
}

export function getPlanLimit(
  plan: LoyalFlowPlan,
  resource: PlanResource,
  limits: PlanLimits = planCatalog[plan].limits,
) {
  return limits[resource];
}

export function isWithinPlanLimit(
  plan: LoyalFlowPlan,
  resource: PlanResource,
  currentCount: number,
  additional = 1,
  limits: PlanLimits = planCatalog[plan].limits,
) {
  const limit = getPlanLimit(plan, resource, limits);
  return limit === null || currentCount + additional <= limit;
}

export function getPlanUsage(
  plan: LoyalFlowPlan,
  usage: Record<PlanResource, number>,
  limits: PlanLimits = planCatalog[plan].limits,
) {
  return planResources.map((resource) => {
    const limit = getPlanLimit(plan, resource, limits);
    const used = usage[resource];
    return {
      resource,
      used,
      limit,
      remaining: limit === null ? null : Math.max(limit - used, 0),
      reached: limit !== null && used >= limit,
    };
  });
}

/**
 * Entitlements never activate external providers by themselves.
 * Credentials and production activation remain separate security gates.
 */
export function canActivateProviderFromEntitlement() {
  return false;
}
