import prisma from "@/lib/prisma";
import {
  extractWhatsAppDeliveryStatusEvents,
  type WhatsAppDeliveryStatus,
} from "@/lib/server/integrations/whatsapp-webhook";

type PersistedWhatsAppDeliveryStatus =
  | "ACCEPTED"
  | WhatsAppDeliveryStatus;

const ALLOWED_PREVIOUS_STATUSES: Readonly<
  Record<WhatsAppDeliveryStatus, readonly PersistedWhatsAppDeliveryStatus[]>
> = {
  OTHER: [],
  SENT: ["OTHER", "ACCEPTED"],
  DELIVERED: ["OTHER", "ACCEPTED", "SENT"],
  READ: ["OTHER", "ACCEPTED", "SENT", "DELIVERED"],
  FAILED: ["OTHER", "ACCEPTED", "SENT"],
};

export function allowedPreviousWhatsAppDeliveryStatuses(
  incoming: WhatsAppDeliveryStatus,
) {
  return ALLOWED_PREVIOUS_STATUSES[incoming];
}

/**
 * Persists Meta delivery state without changing the durable IntegrationJob
 * execution status. Delivery webhooks are observability signals only: they can
 * never requeue or resend a customer notification.
 */
export async function persistWhatsAppDeliveryStatusFromWebhook(payload: unknown) {
  const events = extractWhatsAppDeliveryStatusEvents(payload);
  let persistedStatusCount = 0;

  for (const event of events) {
    const allowedPrevious = allowedPreviousWhatsAppDeliveryStatuses(event.status);
    const updated = await prisma.integrationJob.updateMany({
      where: {
        kind: "WHATSAPP_CUSTOMER_NOTIFICATION",
        providerMessageId: event.providerMessageId,
        OR: [
          { providerDeliveryStatus: null },
          ...(allowedPrevious.length
            ? [{ providerDeliveryStatus: { in: [...allowedPrevious] } }]
            : []),
        ],
      },
      data: {
        providerDeliveryStatus: event.status,
        ...(event.timestamp ? { providerStatusAt: event.timestamp } : {}),
      },
    });
    persistedStatusCount += updated.count;
  }

  return persistedStatusCount;
}
