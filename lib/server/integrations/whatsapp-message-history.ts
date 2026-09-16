import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  AUTOMATIC_CUSTOMER_MESSAGE_EVENTS,
  isCustomerMessagePayload,
  type AutomaticCustomerMessageEvent,
  type CustomerMessagePayload,
} from "@/lib/server/integrations/customer-messaging";

export const WHATSAPP_HISTORY_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "DEAD",
] as const;

export type WhatsAppHistoryStatus =
  (typeof WHATSAPP_HISTORY_STATUSES)[number];

export type WhatsAppHistoryEntry = Readonly<{
  id: string;
  status: WhatsAppHistoryStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  providerMessageId: string | null;
  providerDeliveryStatus:
    | "ACCEPTED"
    | "SENT"
    | "DELIVERED"
    | "READ"
    | "FAILED"
    | "OTHER"
    | null;
  providerStatusAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  payload: CustomerMessagePayload;
  customerName: string;
  customerActive: boolean;
  whatsappPhoneE164: string | null;
  whatsappOptInAt: Date | null;
  whatsappOptedOutAt: Date | null;
}>;

export type WhatsAppHistoryPage = Readonly<{
  entries: readonly WhatsAppHistoryEntry[];
  nextCursor: string | null;
}>;

export function parseWhatsAppHistoryStatus(value: unknown) {
  return typeof value === "string" &&
    WHATSAPP_HISTORY_STATUSES.includes(value as WhatsAppHistoryStatus)
    ? (value as WhatsAppHistoryStatus)
    : null;
}

export function parseWhatsAppHistoryEvent(value: unknown) {
  return typeof value === "string" &&
    AUTOMATIC_CUSTOMER_MESSAGE_EVENTS.includes(
      value as AutomaticCustomerMessageEvent,
    )
    ? (value as AutomaticCustomerMessageEvent)
    : null;
}

function boundedText(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= maxLength
    ? normalized
    : null;
}

/**
 * One tenant-scoped history query over the durable IntegrationJob outbox.
 * Recovery views never read provider state from a second queue or shadow table.
 */
export async function getWhatsAppMessageHistoryPage(input: Readonly<{
  businessId: string;
  customerId?: string | null;
  event?: AutomaticCustomerMessageEvent | null;
  status?: WhatsAppHistoryStatus | null;
  cursor?: string | null;
  pageSize?: number;
}>): Promise<WhatsAppHistoryPage> {
  const businessId = boundedText(input.businessId);
  if (!businessId) return { entries: [], nextCursor: null };

  const customerId = boundedText(input.customerId);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 50);
  const payloadFilters: Prisma.IntegrationJobWhereInput[] = [];
  if (customerId) {
    payloadFilters.push({
      payload: { path: ["customerId"], equals: customerId },
    });
  }
  if (input.event) {
    payloadFilters.push({
      payload: { path: ["event"], equals: input.event },
    });
  }

  const cursor = boundedText(input.cursor);
  const rows = await prisma.integrationJob.findMany({
    where: {
      businessId,
      kind: "WHATSAPP_CUSTOMER_NOTIFICATION",
      ...(input.status ? { status: input.status } : {}),
      ...(payloadFilters.length > 0 ? { AND: payloadFilters } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: pageSize + 1,
    select: {
      id: true,
      status: true,
      attemptCount: true,
      lastErrorCode: true,
      providerMessageId: true,
      providerDeliveryStatus: true,
      providerStatusAt: true,
      payload: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const pageRows = rows.slice(0, pageSize);
  const parsedRows = pageRows.flatMap((row) =>
    isCustomerMessagePayload(row.payload) ? [{ row, payload: row.payload }] : [],
  );
  const customerIds = [
    ...new Set(parsedRows.map(({ payload }) => payload.customerId)),
  ];
  const customers =
    customerIds.length === 0
      ? []
      : await prisma.customer.findMany({
          where: {
            businessId,
            id: { in: customerIds },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isActive: true,
            whatsappPhoneE164: true,
            whatsappOptInAt: true,
            whatsappOptedOutAt: true,
          },
        });
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));

  const entries = parsedRows.map(({ row, payload }) => {
    const customer = customerById.get(payload.customerId);
    const customerName = customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
        customer.firstName
      : payload.customerId;

    return {
      id: row.id,
      status: row.status,
      attemptCount: row.attemptCount,
      lastErrorCode: row.lastErrorCode,
      providerMessageId: row.providerMessageId,
      providerDeliveryStatus: row.providerDeliveryStatus,
      providerStatusAt: row.providerStatusAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload,
      customerName,
      customerActive: customer?.isActive ?? false,
      whatsappPhoneE164: customer?.whatsappPhoneE164 ?? null,
      whatsappOptInAt: customer?.whatsappOptInAt ?? null,
      whatsappOptedOutAt: customer?.whatsappOptedOutAt ?? null,
    } satisfies WhatsAppHistoryEntry;
  });

  return {
    entries,
    nextCursor: rows.length > pageSize ? (pageRows.at(-1)?.id ?? null) : null,
  };
}

export async function getLatestWhatsAppMessageForCustomer(input: Readonly<{
  businessId: string;
  customerId: string;
}>) {
  const page = await getWhatsAppMessageHistoryPage({
    businessId: input.businessId,
    customerId: input.customerId,
    pageSize: 1,
  });
  return page.entries[0] ?? null;
}
