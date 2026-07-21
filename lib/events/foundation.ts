export const internalEventTypes = [
  "LOYALTY_BALANCE_CHANGED",
  "REWARD_STATE_CHANGED",
  "CUSTOMER_MEMBERSHIP_CHANGED",
  "BUSINESS_PRESENTATION_CHANGED",
] as const;

export type InternalEventType = (typeof internalEventTypes)[number];

export type InternalEvent = {
  type: InternalEventType;
  businessId: string;
  customerId: string | null;
  sourceId: string;
  occurredAt: Date;
  idempotencyKey: string;
  // Payload must contain non-PII operational facts only.
  payload: Record<string, string | number | boolean | null>;
};

type InternalEventInput = Omit<InternalEvent, "idempotencyKey">;

function safeEventPart(value: string) {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

/**
 * Creates a deterministic, tenant-scoped envelope suitable for a future
 * durable outbox. This phase keeps it in-process and performs no delivery.
 */
export function createInternalEvent(input: InternalEventInput): InternalEvent | null {
  if (
    !internalEventTypes.includes(input.type) ||
    !safeEventPart(input.businessId) ||
    !safeEventPart(input.sourceId) ||
    (input.customerId !== null && !safeEventPart(input.customerId))
  ) {
    return null;
  }

  return {
    ...input,
    idempotencyKey: [input.type, input.businessId, input.customerId ?? "business", input.sourceId].join(":"),
  };
}

export function canConsumeInternalEvent(
  event: InternalEvent,
  consumerBusinessId: string
) {
  return event.businessId === consumerBusinessId;
}

/** Webhook and provider delivery are deliberately disabled until an outbox exists. */
export function getInternalEventDeliveryDecision() {
  return "NOOP_DISABLED" as const;
}
