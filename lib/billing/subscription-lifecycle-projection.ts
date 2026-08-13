import type { SubscriptionLifecycleState } from "@loyalflow/domain/billing/subscription-lifecycle";

export const legacyOperationalPaymentStates = [
  "TRIAL",
  "PAID",
  "DUE_SOON",
  "DUE",
  "OVERDUE",
  "SUSPENDED",
] as const;

export type LegacyOperationalPaymentState =
  (typeof legacyOperationalPaymentStates)[number];

/**
 * Read-only compatibility projection for the current manual billing model.
 * It does not persist lifecycle state or change entitlement enforcement.
 * PENDING, CANCELED, and EXPIRED have no truthful legacy representation.
 */
export function projectPaymentStateToSubscriptionLifecycle(
  value: unknown,
): SubscriptionLifecycleState | null {
  if (value === "TRIAL") return "TRIALING";
  if (value === "OVERDUE") return "PAST_DUE";
  if (value === "SUSPENDED") return "SUSPENDED";
  if (value === "PAID" || value === "DUE_SOON" || value === "DUE") {
    return "ACTIVE";
  }
  return null;
}
