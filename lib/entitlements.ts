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

export type LoyalFlowPlan = "FREE";

const freeFeatures = new Set<ProductFeature>(productFeatures);

/**
 * Centralizes product capability decisions without billing, payment, or remote
 * plan state. Provider activation still has its own security/configuration
 * gates and cannot be enabled by entitlement alone.
 */
export function hasFeatureEntitlement(
  _plan: LoyalFlowPlan,
  feature: ProductFeature
) {
  return freeFeatures.has(feature);
}

export function getPlanEntitlements(plan: LoyalFlowPlan) {
  return productFeatures.filter((feature) => hasFeatureEntitlement(plan, feature));
}

export function canActivateProviderFromEntitlement() {
  return false;
}
