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
  rewardId?: string;
  offerId?: string;
}>;

function isOptionalBoundedIdentifier(value: unknown) {
  return (
    value === undefined ||
    (typeof value === "string" &&
      value.trim().length >= 1 &&
      value.length <= 200)
  );
}

export function isCustomerMessagePayload(
  value: unknown,
): value is CustomerMessagePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const validShape =
    candidate.version === 1 &&
    typeof candidate.customerId === "string" &&
    typeof candidate.event === "string" &&
    CUSTOMER_MESSAGE_EVENTS.includes(candidate.event as CustomerMessageEvent) &&
    (candidate.deliveryMode === undefined ||
      candidate.deliveryMode === "AUTOMATIC" ||
      candidate.deliveryMode === "MANUAL") &&
    (candidate.balance === undefined ||
      typeof candidate.balance === "number") &&
    (candidate.rewardName === undefined ||
      typeof candidate.rewardName === "string") &&
    isOptionalBoundedIdentifier(candidate.rewardId) &&
    isOptionalBoundedIdentifier(candidate.offerId);

  if (!validShape) return false;
  if (candidate.event === "NEW_REWARD")
    return typeof candidate.rewardId === "string";
  if (candidate.event === "NEW_OFFER")
    return typeof candidate.offerId === "string";
  return candidate.rewardId === undefined && candidate.offerId === undefined;
}

async function findEligibleCustomer(
  transaction: Prisma.TransactionClient,
  input: Readonly<{ businessId: string; customerId: string }>,
) {
  return transaction.customer.findFirst({
    where: {
      id: input.customerId,
      businessId: input.businessId,
      isActive: true,
      whatsappOptInAt: { not: null },
      whatsappOptedOutAt: null,
    },
    select: { id: true },
  });
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

type CustomerMessagePublication =
  | Readonly<{
      event: "NEW_REWARD";
      rewardId: string;
    }>
  | Readonly<{
      event: "NEW_OFFER";
      offerId: string;
    }>;

/**
 * Materializes one durable delivery candidate per currently opted-in active
 * customer. The worker revalidates the published Reward/Offer and, for Offers,
 * the authoritative audience and visibility window immediately before send.
 */
export async function enqueueCustomerMessagePublicationJobs(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    businessId: string;
    publicationKey: string;
    availableAt?: Date;
  }> &
    CustomerMessagePublication,
) {
  const automationEnabled = await isBusinessWhatsAppAutomationEnabled(
    transaction,
    {
      businessId: input.businessId,
      event: input.event,
    },
  );
  if (!automationEnabled) return [];

  const customers = await transaction.customer.findMany({
    where: {
      businessId: input.businessId,
      isActive: true,
      whatsappOptInAt: { not: null },
      whatsappOptedOutAt: null,
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const jobs = [];
  for (const customer of customers) {
    const payload: CustomerMessagePayload = {
      version: 1,
      event: input.event,
      customerId: customer.id,
      ...(input.event === "NEW_REWARD"
        ? { rewardId: input.rewardId }
        : { offerId: input.offerId }),
    };
    jobs.push(
      await enqueueIntegrationJob(transaction, {
        businessId: input.businessId,
        kind: "WHATSAPP_CUSTOMER_NOTIFICATION",
        idempotencyKey: `customer-message:${input.event.toLowerCase()}:${input.publicationKey}:${customer.id}`,
        payload,
        ...(input.availableAt ? { availableAt: input.availableAt } : {}),
      }),
    );
  }

  return jobs;
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
