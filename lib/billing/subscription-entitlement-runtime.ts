import {
  canPerformSubscriptionOperation,
  type SubscriptionOperationIntent,
} from "@loyalflow/domain/billing/subscription-lifecycle";
import type { Prisma } from "@/generated/prisma/client";
import { resolveEffectiveSubscriptionLifecycleState } from "@/lib/billing/subscription-trial-runtime";

type SubscriptionStateReader = Pick<Prisma.TransactionClient, "business">;

export async function canBusinessPerformSubscriptionOperation(
  reader: SubscriptionStateReader,
  businessId: string,
  intent: SubscriptionOperationIntent,
): Promise<boolean> {
  const business = await reader.business.findUnique({
    where: { id: businessId },
    select: {
      subscriptionLifecycleState: true,
      trialEndsAt: true,
    },
  });

  if (!business) {
    return false;
  }

  const effectiveState = resolveEffectiveSubscriptionLifecycleState({
    subscriptionLifecycleState: business.subscriptionLifecycleState,
    trialEndsAt: business.trialEndsAt,
  });

  return canPerformSubscriptionOperation(effectiveState, intent);
}
