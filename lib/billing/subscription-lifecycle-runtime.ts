import type {
  SubscriptionLifecycleEvent,
  SubscriptionLifecycleState,
} from "@loyalflow/domain/billing/subscription-lifecycle";
import { transitionSubscriptionLifecycle } from "@loyalflow/domain/billing/subscription-lifecycle";

import prisma from "@/lib/prisma";

export type PersistSubscriptionTransitionResult =
  | Readonly<{
      ok: true;
      previous: SubscriptionLifecycleState;
      current: SubscriptionLifecycleState;
      version: number;
    }>
  | Readonly<{
      ok: false;
      reason: "NOT_FOUND" | "INVALID_TRANSITION" | "VERSION_CONFLICT";
    }>;

/**
 * Persists only an already-approved provider-neutral lifecycle transition.
 * The compare-and-swap update prevents two admin/provider events from silently
 * overwriting each other. Provider verification and entitlement enforcement
 * deliberately remain outside this Beta slice.
 */
export async function persistSubscriptionLifecycleTransition(input: {
  businessId: string;
  event: SubscriptionLifecycleEvent;
  expectedVersion: number;
  actorId: string;
  actorEmail?: string | null;
  now?: Date;
}): Promise<PersistSubscriptionTransitionResult> {
  const current = await prisma.business.findUnique({
    where: { id: input.businessId },
    select: {
      id: true,
      subscriptionLifecycleState: true,
      subscriptionLifecycleVersion: true,
    },
  });

  if (!current) return { ok: false, reason: "NOT_FOUND" };
  if (current.subscriptionLifecycleVersion !== input.expectedVersion) {
    return { ok: false, reason: "VERSION_CONFLICT" };
  }

  const decision = transitionSubscriptionLifecycle({
    current: current.subscriptionLifecycleState,
    event: input.event,
  });
  if (!decision.allowed) return { ok: false, reason: decision.reason };

  const changedAt = input.now ?? new Date();
  const nextVersion = input.expectedVersion + 1;
  const cancelAtPeriodEnd = decision.next === "CANCELED";

  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transaction.business.updateMany({
      where: {
        id: current.id,
        subscriptionLifecycleState: current.subscriptionLifecycleState,
        subscriptionLifecycleVersion: input.expectedVersion,
      },
      data: {
        subscriptionLifecycleState: decision.next,
        subscriptionLifecycleVersion: { increment: 1 },
        subscriptionLifecycleChangedAt: changedAt,
        subscriptionCancelAtPeriodEnd: cancelAtPeriodEnd,
      },
    });

    if (result.count !== 1) return false;

    await transaction.businessActivity.create({
      data: {
        type: "BUSINESS_SETTINGS_UPDATED",
        description: "Subscription lifecycle updated",
        businessId: current.id,
        metadata: {
          actorId: input.actorId,
          ...(input.actorEmail ? { actorEmail: input.actorEmail } : {}),
          event: input.event,
          previousState: current.subscriptionLifecycleState,
          nextState: decision.next,
          lifecycleVersion: nextVersion,
        },
      },
    });

    return true;
  });

  if (!updated) return { ok: false, reason: "VERSION_CONFLICT" };

  return {
    ok: true,
    previous: current.subscriptionLifecycleState,
    current: decision.next,
    version: nextVersion,
  };
}
