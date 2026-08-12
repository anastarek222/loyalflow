export const subscriptionLifecycleStates = [
  "PENDING",
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELED",
  "EXPIRED",
] as const;

export type SubscriptionLifecycleState =
  (typeof subscriptionLifecycleStates)[number];

export const subscriptionLifecycleEvents = [
  "TRIAL_STARTED",
  "ACTIVATION_SUCCEEDED",
  "RENEWAL_FAILED",
  "GRACE_PERIOD_EXPIRED",
  "CANCELLATION_REQUESTED",
  "CANCELED_PERIOD_EXPIRED",
  "RECOVERY_SUCCEEDED",
] as const;

export type SubscriptionLifecycleEvent =
  (typeof subscriptionLifecycleEvents)[number];

export type SubscriptionAccessPolicy = Readonly<{
  paidFeatures: "FULL" | "CURRENT_PERIOD" | "READ_EXPORT_ONLY" | "NONE";
  allowPlanExpansion: boolean;
  allowNewPurchase: boolean;
  preserveData: true;
  preserveRolesAndTenantIsolation: true;
}>;

const accessPolicies: Record<
  SubscriptionLifecycleState,
  SubscriptionAccessPolicy
> = {
  PENDING: {
    paidFeatures: "NONE",
    allowPlanExpansion: false,
    allowNewPurchase: true,
    preserveData: true,
    preserveRolesAndTenantIsolation: true,
  },
  TRIALING: {
    paidFeatures: "FULL",
    allowPlanExpansion: true,
    allowNewPurchase: true,
    preserveData: true,
    preserveRolesAndTenantIsolation: true,
  },
  ACTIVE: {
    paidFeatures: "FULL",
    allowPlanExpansion: true,
    allowNewPurchase: true,
    preserveData: true,
    preserveRolesAndTenantIsolation: true,
  },
  PAST_DUE: {
    paidFeatures: "FULL",
    allowPlanExpansion: false,
    allowNewPurchase: false,
    preserveData: true,
    preserveRolesAndTenantIsolation: true,
  },
  SUSPENDED: {
    paidFeatures: "READ_EXPORT_ONLY",
    allowPlanExpansion: false,
    allowNewPurchase: false,
    preserveData: true,
    preserveRolesAndTenantIsolation: true,
  },
  CANCELED: {
    paidFeatures: "CURRENT_PERIOD",
    allowPlanExpansion: false,
    allowNewPurchase: false,
    preserveData: true,
    preserveRolesAndTenantIsolation: true,
  },
  EXPIRED: {
    paidFeatures: "READ_EXPORT_ONLY",
    allowPlanExpansion: false,
    allowNewPurchase: false,
    preserveData: true,
    preserveRolesAndTenantIsolation: true,
  },
};

const transitions: Record<
  SubscriptionLifecycleState,
  Partial<Record<SubscriptionLifecycleEvent, SubscriptionLifecycleState>>
> = {
  PENDING: {
    TRIAL_STARTED: "TRIALING",
    ACTIVATION_SUCCEEDED: "ACTIVE",
  },
  TRIALING: {
    ACTIVATION_SUCCEEDED: "ACTIVE",
    CANCELLATION_REQUESTED: "CANCELED",
  },
  ACTIVE: {
    RENEWAL_FAILED: "PAST_DUE",
    CANCELLATION_REQUESTED: "CANCELED",
  },
  PAST_DUE: {
    GRACE_PERIOD_EXPIRED: "SUSPENDED",
    CANCELLATION_REQUESTED: "CANCELED",
    RECOVERY_SUCCEEDED: "ACTIVE",
  },
  SUSPENDED: {
    RECOVERY_SUCCEEDED: "ACTIVE",
  },
  CANCELED: {
    CANCELED_PERIOD_EXPIRED: "EXPIRED",
    RECOVERY_SUCCEEDED: "ACTIVE",
  },
  EXPIRED: {
    RECOVERY_SUCCEEDED: "ACTIVE",
  },
};

export function getSubscriptionAccessPolicy(
  state: SubscriptionLifecycleState,
): SubscriptionAccessPolicy {
  return accessPolicies[state];
}

export function transitionSubscriptionLifecycle(input: {
  current: SubscriptionLifecycleState;
  event: SubscriptionLifecycleEvent;
}):
  | Readonly<{ allowed: true; next: SubscriptionLifecycleState }>
  | Readonly<{ allowed: false; reason: "INVALID_TRANSITION" }> {
  const next = transitions[input.current][input.event];

  return next
    ? { allowed: true, next }
    : { allowed: false, reason: "INVALID_TRANSITION" };
}
