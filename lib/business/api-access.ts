import type { ApiBusinessAccessRead } from "@loyalflow/contracts/api/v1";

import { getPlanEntitlements, type LoyalFlowPlan } from "@/lib/entitlements";
import { canPerform, capabilities, type TenantUser } from "@/lib/permissions";

export function toApiBusinessAccess(input: {
  actor: TenantUser;
  businessId: string;
  plan: LoyalFlowPlan;
}): ApiBusinessAccessRead {
  return {
    capabilities: capabilities.filter((capability) =>
      canPerform(input.actor, input.businessId, capability),
    ),
    entitlements: getPlanEntitlements(input.plan),
  };
}
