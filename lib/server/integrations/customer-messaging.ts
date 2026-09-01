import type { Prisma } from "@/generated/prisma/client";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";

export const CUSTOMER_MESSAGE_EVENTS = [
  "WELCOME",
  "BALANCE_UPDATED",
  "REWARD_READY",
  "REWARD_REDEEMED",
] as const;

export type CustomerMessageEvent = (typeof CUSTOMER_MESSAGE_EVENTS)[number];

export type CustomerMessagePayload = Readonly<{
  version: 1;
  event: CustomerMessageEvent;
  customerId: string;
  balance?: number;
  rewardName?: string;
}>;

export function isCustomerMessagePayload(
  value: unknown,
): value is CustomerMessagePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 1 &&
    typeof candidate.customerId === "string" &&
    typeof candidate.event === "string" &&
    CUSTOMER_MESSAGE_EVENTS.includes(candidate.event as CustomerMessageEvent) &&
    (candidate.balance === undefined || typeof candidate.balance === "number") &&
    (candidate.rewardName === undefined || typeof candidate.rewardName === "string")
  );
}

/**
 * Enqueues one customer-facing message inside the same database transaction as
 * the business event. The employee never sends a message manually. Consent is
 * checked both here and again by the worker immediately before delivery.
 */
export async function enqueueCustomerMessageJob(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    businessId: string;
    customerId: string;
    event: CustomerMessageEvent;
    eventKey: string;
    balance?: number;
    rewardName?: string;
  }>,
) {
  const customer = await transaction.customer.findFirst({
    where: {
      id: input.customerId,
      businessId: input.businessId,
      isActive: true,
      whatsappOptInAt: { not: null },
    },
    select: { id: true },
  });
  if (!customer) return null;

  const payload: CustomerMessagePayload = {
    version: 1,
    event: input.event,
    customerId: input.customerId,
    ...(input.balance === undefined ? {} : { balance: input.balance }),
    ...(input.rewardName ? { rewardName: input.rewardName } : {}),
  };

  return enqueueIntegrationJob(transaction, {
    businessId: input.businessId,
    kind: "WHATSAPP_CUSTOMER_NOTIFICATION",
    idempotencyKey: `customer-message:${input.event.toLowerCase()}:${input.eventKey}`,
    payload,
  });
}
