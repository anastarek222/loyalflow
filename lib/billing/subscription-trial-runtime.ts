import type { SubscriptionLifecycleState } from "@loyalflow/domain/billing/subscription-lifecycle";

export function resolveEffectiveSubscriptionLifecycleState(
  input: {
    subscriptionLifecycleState: SubscriptionLifecycleState;
    trialEndsAt: Date | null;
  },
  options?: { now?: Date },
): SubscriptionLifecycleState {
  if (input.subscriptionLifecycleState !== "TRIALING") {
    return input.subscriptionLifecycleState;
  }

  if (!input.trialEndsAt) {
    return "TRIALING";
  }

  const now = options?.now ?? new Date();
  return now.getTime() < input.trialEndsAt.getTime() ? "TRIALING" : "EXPIRED";
}
