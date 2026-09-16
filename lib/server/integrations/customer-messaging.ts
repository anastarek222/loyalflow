import type { Prisma } from "@/generated/prisma/client";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";
import { isBusinessWhatsAppAutomationEnabled } from "@/lib/server/integrations/business-whatsapp-automation-settings";

export const CUSTOMER_MESSAGE_EVENTS = [
  "WELCOME",
  "BALANCE_UPDATED",
  "REWARD_READY",
  "REWARD_REDEEMED",
  "NEW_REWARD",
  "NEW_OFFER",
] as const;

export type CustomerMessageEvent = (typeof CUSTOMER_MESSAGE_EVENTS)[number];

export const AUTOMATIC_CUSTOMER_MESSAGE_EVENTS = [
  "WELCOME",
  "BALANCE_UPDATED",
  "REWARD_READY",
  "REWARD_REDEEMED",
  "NEW_REWARD",
  "NEW_OFFER",
] as const;

export const MANUAL_CUSTOMER_MESSAGE_EVENTS = [
  "WELCOME",
  "BALANCE_UPDATED",
  "REWARD_READY",
  "REWARD_REDEEMED",
] as const;

export type AutomaticCustomerMessageEvent =
  (typeof AUTOMATIC_CUSTOMER_MESSAGE_EVENTS)[number];
export type ManualCustomerMessageEvent =
  (typeof MANUAL_CUSTOMER_MESSAGE_EVENTS)[number];
export type CustomerMessageDeliveryMode = "AUTOMATIC" | "MANUAL";

export function isAutomaticCustomerMessageEvent(
  event: CustomerMessageEvent,
): event is AutomaticCustomerMessageEvent {
  return AUTOMATIC_CUSTOMER_MESSAGE_EVENTS.includes(
    event as AutomaticCustomerMessageEvent,
  );
}

export function isManualCustomerMessageEvent(
  event: CustomerMessageEvent,
): event is ManualCustomerMessageEvent {
  return MANUAL_CUSTOMER_MESSAGE_EVENTS.includes(
    event as ManualCustomerMessageEvent,
  );
}

export type CustomerMessagePayload = Readonly<{
  version: 1;
  event: CustomerMessageEvent;
  customerId: string;
  deliveryMode?: CustomerMessageDeliveryMode;
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
    (candidate.deliveryMode === undefined ||
      candidate.deliveryMode === "AUTOMATIC" ||
      candidate.deliveryMode === "MANUAL") &&
    (candidate.balance === undefined || typeof candidate.balance === "number") &&
    (candidate.rewardName === undefined || typeof candidate.rewardName === "string")
  );
}

async function findEligibleCustomer(
  transaction: Prisma.TransactionClient,
  input: Readonly<{ businessId: string; customerId: string }>,
) {
  const customer = await transaction.customer.findFirst({
    where: {
      id: input.customerId,
      businessId: input.businessId,
      isActive: true,
      whatsappPhoneE164: { not: null },
      whatsappOptInAt: { not: null },
      whatsappOptedOutAt: null,
    },
    select: {
      id: true,
      phone: true,
      whatsappPhoneE164: true,
    },
  });

  if (!customer || customer.phone !== customer.whatsappPhoneE164) return null;
  return customer;
}

/**
 * Enqueues one automatic customer-facing message inside the same database
 * transaction as the business event. Consent and the Owner's automation
 * controls are checked both here and again by the worker before delivery.
 * Missing deliveryMode remains the backward-compatible AUTOMATIC contract.
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
  if (!isAutomaticCustomerMessageEvent(input.event)) return null;

  const automationEnabled = await isBusinessWhatsAppAutomationEnabled(
    transaction,
    {
      businessId: input.businessId,
      event: input.event,
    },
  );
  if (!automationEnabled) return null;

  const customer = await findEligibleCustomer(transaction, input);
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

/**
 * Queues an explicit staff/owner delivery through the same durable WhatsApp
 * outbox. Manual delivery is intentionally independent from Global Pause and
 * per-event automatic toggles, but it still requires active customer consent.
 */
export async function enqueueManualCustomerMessageJob(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    businessId: string;
    customerId: string;
    event: ManualCustomerMessageEvent;
    requestId: string;
    balance?: number;
    rewardName?: string;
  }>,
) {
  if (!isManualCustomerMessageEvent(input.event)) return null;
  const customer = await findEligibleCustomer(transaction, input);
  if (!customer) return null;

  const payload: CustomerMessagePayload = {
    version: 1,
    event: input.event,
    customerId: input.customerId,
    deliveryMode: "MANUAL",
    ...(input.balance === undefined ? {} : { balance: input.balance }),
    ...(input.rewardName ? { rewardName: input.rewardName } : {}),
  };

  return enqueueIntegrationJob(transaction, {
    businessId: input.businessId,
    kind: "WHATSAPP_CUSTOMER_NOTIFICATION",
    idempotencyKey: `customer-message:manual:${input.event.toLowerCase()}:${input.requestId}`,
    payload,
  });
}

/**
 * Bounded business-wide producer for catalogue announcements. It deliberately
 * receives an optional authoritative audience instead of re-deriving Offer
 * segmentation inside the messaging layer.
 */
export async function enqueueCustomerMessageAudienceJobs(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    businessId: string;
    event: "NEW_REWARD" | "NEW_OFFER";
    eventKey: string;
    rewardName?: string;
    customerIds?: readonly string[];
  }>,
) {
  const automationEnabled = await isBusinessWhatsAppAutomationEnabled(
    transaction,
    { businessId: input.businessId, event: input.event },
  );
  if (!automationEnabled) return [];

  const customers = await transaction.customer.findMany({
    where: {
      businessId: input.businessId,
      isActive: true,
      whatsappPhoneE164: { not: null },
      whatsappOptInAt: { not: null },
      whatsappOptedOutAt: null,
      ...(input.customerIds ? { id: { in: [...input.customerIds] } } : {}),
    },
    select: { id: true, phone: true, whatsappPhoneE164: true },
    orderBy: { id: "asc" },
  });

  const jobs = [];
  for (const customer of customers) {
    if (customer.phone !== customer.whatsappPhoneE164) continue;
    const job = await enqueueIntegrationJob(transaction, {
      businessId: input.businessId,
      kind: "WHATSAPP_CUSTOMER_NOTIFICATION",
      idempotencyKey: `customer-message:${input.event.toLowerCase()}:${input.eventKey}:${customer.id}`,
      payload: {
        version: 1,
        event: input.event,
        customerId: customer.id,
        ...(input.rewardName ? { rewardName: input.rewardName } : {}),
      } satisfies CustomerMessagePayload,
    });
    jobs.push(job);
  }

  return jobs;
}
