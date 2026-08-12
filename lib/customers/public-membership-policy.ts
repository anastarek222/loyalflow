import {
  hasFeatureEntitlement,
  isWithinPlanLimit,
  type LoyalFlowPlan,
  type PlanLimits,
} from "@/lib/entitlements";

export function canCreatePublicMembership(
  plan: LoyalFlowPlan,
  currentCustomerCount: number,
  limits: PlanLimits,
) {
  return isWithinPlanLimit(plan, "CUSTOMERS", currentCustomerCount, 1, limits);
}

export function canApplyPublicReferral(plan: LoyalFlowPlan) {
  return hasFeatureEntitlement(plan, "REFERRALS");
}
