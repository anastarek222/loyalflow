import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  AUTOMATIC_CUSTOMER_MESSAGE_EVENTS,
  type AutomaticCustomerMessageEvent,
} from "@/lib/server/integrations/customer-messaging";
import type { BusinessWhatsAppAutomationControls } from "@/lib/server/integrations/whatsapp-automation-policy";
import { isWhatsAppAutomationEventSelected } from "@/lib/server/integrations/whatsapp-automation-policy";

export const WHATSAPP_TEMPLATE_APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "UNKNOWN",
] as const;

export type WhatsAppTemplateApprovalStatus =
  (typeof WHATSAPP_TEMPLATE_APPROVAL_STATUSES)[number];

export type BusinessWhatsAppTemplateBinding = Readonly<{
  businessId: string;
  wabaId: string | null;
  event: AutomaticCustomerMessageEvent;
  language: "AR" | "EN";
  templateName: string;
  templateLanguageCode: string;
  contentSha256: string;
  approvalStatus: WhatsAppTemplateApprovalStatus;
  providerTemplateId: string | null;
  providerStatusUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

type BindingClient = Pick<Prisma.TransactionClient, "$queryRaw">;

export type OwnerAutomaticMessages = Readonly<{
  whatsappWelcomeMessage: string | null;
  whatsappBalanceMessage: string | null;
  whatsappRewardMessage: string | null;
  whatsappRedeemedMessage: string | null;
  newRewardMessage: string | null;
  newOfferMessage: string | null;
}>;

export function ownerMessageForAutomaticEvent(
  event: AutomaticCustomerMessageEvent,
  messages: OwnerAutomaticMessages,
) {
  const value =
    event === "WELCOME"
      ? messages.whatsappWelcomeMessage
      : event === "BALANCE_UPDATED"
        ? messages.whatsappBalanceMessage
        : event === "REWARD_READY"
          ? messages.whatsappRewardMessage
          : event === "REWARD_REDEEMED"
            ? messages.whatsappRedeemedMessage
            : event === "NEW_REWARD"
              ? messages.newRewardMessage
              : messages.newOfferMessage;
  return value?.trim() ?? "";
}

export function hashBusinessWhatsAppTemplate(template: string) {
  return createHash("sha256").update(template.trim(), "utf8").digest("hex");
}

export async function getBusinessWhatsAppTemplateBindings(
  client: BindingClient,
  input: Readonly<{
    businessId: string;
    language: "AR" | "EN";
  }>,
): Promise<BusinessWhatsAppTemplateBinding[]> {
  return client.$queryRaw<BusinessWhatsAppTemplateBinding[]>`
    SELECT
      "businessId",
      "wabaId",
      "event",
      "language",
      "templateName",
      "templateLanguageCode",
      "contentSha256",
      "approvalStatus",
      "providerTemplateId",
      "providerStatusUpdatedAt",
      "createdAt",
      "updatedAt"
    FROM "BusinessWhatsAppTemplateBinding"
    WHERE "businessId" = ${input.businessId}
      AND "language" = ${input.language}
  `;
}

export async function getBusinessWhatsAppTemplateBinding(
  client: BindingClient,
  input: Readonly<{
    businessId: string;
    event: AutomaticCustomerMessageEvent;
    language: "AR" | "EN";
  }>,
): Promise<BusinessWhatsAppTemplateBinding | null> {
  const rows = await client.$queryRaw<BusinessWhatsAppTemplateBinding[]>`
    SELECT
      "businessId",
      "wabaId",
      "event",
      "language",
      "templateName",
      "templateLanguageCode",
      "contentSha256",
      "approvalStatus",
      "providerTemplateId",
      "providerStatusUpdatedAt",
      "createdAt",
      "updatedAt"
    FROM "BusinessWhatsAppTemplateBinding"
    WHERE "businessId" = ${input.businessId}
      AND "event" = ${input.event}
      AND "language" = ${input.language}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getBusinessWhatsAppAutomaticReadiness(
  client: BindingClient,
  input: Readonly<{
    businessId: string;
    wabaId: string | null;
    language: "AR" | "EN";
    messages: OwnerAutomaticMessages;
    automation: BusinessWhatsAppAutomationControls;
  }>,
) {
  const selectedEvents = AUTOMATIC_CUSTOMER_MESSAGE_EVENTS.filter((event) =>
    isWhatsAppAutomationEventSelected(input.automation, event),
  );
  const configuredEvents = selectedEvents.filter(
    (event) => ownerMessageForAutomaticEvent(event, input.messages).length > 0,
  );
  const missingCopyEvents = selectedEvents.filter(
    (event) => ownerMessageForAutomaticEvent(event, input.messages).length === 0,
  );

  if (selectedEvents.length === 0) {
    return {
      ready: false,
      hasEnabledMessages: false,
      selectedEvents: [] as AutomaticCustomerMessageEvent[],
      enabledEvents: [] as AutomaticCustomerMessageEvent[],
      missingCopyEvents: [] as AutomaticCustomerMessageEvent[],
      blockedEvents: [] as AutomaticCustomerMessageEvent[],
    } as const;
  }

  const bindings = await getBusinessWhatsAppTemplateBindings(client, input);
  const bindingByEvent = new Map(bindings.map((binding) => [binding.event, binding]));
  const blockedEvents = configuredEvents.filter((event) => {
    const binding = bindingByEvent.get(event);
    if (!input.wabaId || !binding || binding.wabaId !== input.wabaId) return true;
    if (binding.approvalStatus !== "APPROVED") return true;
    if (!binding.templateName.trim() || !binding.templateLanguageCode.trim()) {
      return true;
    }

    return (
      binding.contentSha256 !==
      hashBusinessWhatsAppTemplate(
        ownerMessageForAutomaticEvent(event, input.messages),
      )
    );
  });

  return {
    ready: missingCopyEvents.length === 0 && blockedEvents.length === 0,
    hasEnabledMessages: true,
    selectedEvents,
    enabledEvents: input.automation.paused ? [] : configuredEvents,
    missingCopyEvents,
    blockedEvents,
  } as const;
}
