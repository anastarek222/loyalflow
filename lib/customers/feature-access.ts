import type { LoyalFlowPlan, ProductFeature } from "@/lib/entitlements";
import { hasFeatureEntitlement } from "@/lib/entitlements";
import {
  canPerform,
  type Capability,
  type TenantUser,
} from "@/lib/permissions";

function canUseCustomerFeature(
  user: TenantUser,
  businessId: string,
  plan: LoyalFlowPlan,
  capability: Capability,
  feature: ProductFeature,
) {
  return (
    canPerform(user, businessId, capability) &&
    hasFeatureEntitlement(plan, feature)
  );
}

export function canViewCustomerNotesTags(
  user: TenantUser,
  businessId: string,
  plan: LoyalFlowPlan,
) {
  return canUseCustomerFeature(
    user,
    businessId,
    plan,
    "CUSTOMERS_VIEW",
    "CUSTOMER_NOTES_TAGS",
  );
}

export function canManageCustomerNotesTags(
  user: TenantUser,
  businessId: string,
  plan: LoyalFlowPlan,
) {
  return canUseCustomerFeature(
    user,
    businessId,
    plan,
    "CUSTOMERS_EDIT",
    "CUSTOMER_NOTES_TAGS",
  );
}

export function canUseCustomerBulkOperations(
  user: TenantUser,
  businessId: string,
  plan: LoyalFlowPlan,
) {
  return canUseCustomerFeature(
    user,
    businessId,
    plan,
    "CUSTOMERS_EDIT",
    "CUSTOMER_BULK_OPERATIONS",
  );
}

export function canUseCustomerReferrals(
  user: TenantUser,
  businessId: string,
  plan: LoyalFlowPlan,
) {
  return canUseCustomerFeature(
    user,
    businessId,
    plan,
    "CUSTOMERS_EDIT",
    "REFERRALS",
  );
}

export function canUseCustomerCampaigns(
  user: TenantUser,
  businessId: string,
  plan: LoyalFlowPlan,
) {
  return canUseCustomerFeature(
    user,
    businessId,
    plan,
    "SETTINGS_EDIT",
    "CAMPAIGNS",
  );
}
