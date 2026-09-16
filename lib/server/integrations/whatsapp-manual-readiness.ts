import type { Prisma } from "@/generated/prisma/client";
import {
  getBusinessWhatsAppTemplateBindings,
  hashBusinessWhatsAppTemplate,
  ownerMessageForAutomaticEvent,
  type OwnerAutomaticMessages,
} from "@/lib/server/integrations/business-whatsapp-template-bindings";
import { getBusinessWhatsAppCredential } from "@/lib/server/integrations/business-whatsapp-credentials";
import {
  MANUAL_CUSTOMER_MESSAGE_EVENTS,
  type ManualCustomerMessageEvent,
} from "@/lib/server/integrations/customer-messaging";
import { getWhatsAppProviderReadiness } from "@/lib/server/integrations/whatsapp-readiness";

type ReadinessClient = Pick<
  Prisma.TransactionClient,
  "$queryRaw" | "$executeRaw"
>;

export async function getBusinessWhatsAppManualReadiness(
  client: ReadinessClient,
  input: Readonly<{
    businessId: string;
    language: "AR" | "EN";
    messages: OwnerAutomaticMessages;
  }>,
) {
  const [credential, bindings] = await Promise.all([
    getBusinessWhatsAppCredential(client, input.businessId),
    getBusinessWhatsAppTemplateBindings(client, {
      businessId: input.businessId,
      language: input.language,
    }),
  ]);
  const providerReady = getWhatsAppProviderReadiness().providerReady;
  const senderReady = Boolean(
    credential?.phoneNumberId.trim() &&
    credential.wabaId?.trim() &&
    credential.accessTokenCiphertext.trim(),
  );
  const bindingByEvent = new Map(
    bindings.map((binding) => [binding.event, binding]),
  );

  const readyEvents = MANUAL_CUSTOMER_MESSAGE_EVENTS.filter((event) => {
    const message = ownerMessageForAutomaticEvent(event, input.messages);
    const binding = bindingByEvent.get(event);
    return Boolean(
      providerReady &&
      senderReady &&
      message &&
      binding &&
      binding.wabaId === credential?.wabaId &&
      binding.approvalStatus === "APPROVED" &&
      binding.templateName.trim() &&
      binding.templateLanguageCode.trim() &&
      binding.contentSha256 === hashBusinessWhatsAppTemplate(message),
    );
  });

  return {
    providerReady,
    senderReady,
    readyEvents,
    isEventReady(event: ManualCustomerMessageEvent) {
      return readyEvents.includes(event);
    },
  } as const;
}
