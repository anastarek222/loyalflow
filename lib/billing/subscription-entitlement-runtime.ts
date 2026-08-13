import {
  canPerformSubscriptionOperation,
  type SubscriptionOperationIntent,
} from "@loyalflow/domain/billing/subscription-lifecycle";
import type { Prisma } from "@/generated/prisma/client";

type SubscriptionStateReader = Pick<Prisma.TransactionClient, "business">;

export async function canBusinessPerformSubscriptionOperation(
  reader: SubscriptionStateReader,
  businessId: string,
  intent: SubscriptionOperationIntent,
): Promise<boolean> {
  const business = await reader.business.findUnique({
    where: { id: businessId },
    select: { subscriptionLifecycleState: true },
  });

  return business
    ? canPerformSubscriptionOperation(
        business.subscriptionLifecycleState,
        intent,
      )
    : false;
}
