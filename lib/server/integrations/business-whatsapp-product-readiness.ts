import type { Prisma } from "@/generated/prisma/client";
import { getBusinessWhatsAppAutomationSettings } from "@/lib/server/integrations/business-whatsapp-automation-settings";
import { getBusinessWhatsAppCredential } from "@/lib/server/integrations/business-whatsapp-credentials";
import { getBusinessWhatsAppAutomaticReadiness } from "@/lib/server/integrations/business-whatsapp-template-bindings";
import {
  getBusinessWhatsAppConnectionReadiness,
  getWhatsAppProviderReadiness,
} from "@/lib/server/integrations/whatsapp-readiness";

type Client = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;

export type BusinessWhatsAppProductReadinessInput = Readonly<{
  businessId: string;
  language: "AR" | "EN";
  whatsappWelcomeMessage: string | null;
  whatsappBalanceMessage: string | null;
  whatsappRewardMessage: string | null;
  whatsappRedeemedMessage: string | null;
}>;

/** One business-scoped truth for setup indicators outside WhatsApp settings. */
export async function getBusinessWhatsAppProductReadiness(
  client: Client,
  input: BusinessWhatsAppProductReadinessInput,
) {
  const [credential, automation] = await Promise.all([
    getBusinessWhatsAppCredential(client, input.businessId),
    getBusinessWhatsAppAutomationSettings(client, input.businessId),
  ]);

  if (!automation) {
    return {
      state: "NOT_CONNECTED" as const,
      deliveryReady: false,
    };
  }

  const templateReadiness = await getBusinessWhatsAppAutomaticReadiness(client, {
    businessId: input.businessId,
    wabaId: credential?.wabaId ?? null,
    language: input.language,
    messages: {
      whatsappWelcomeMessage: input.whatsappWelcomeMessage,
      whatsappBalanceMessage: input.whatsappBalanceMessage,
      whatsappRewardMessage: input.whatsappRewardMessage,
      whatsappRedeemedMessage: input.whatsappRedeemedMessage,
      newRewardMessage: automation.newRewardMessage,
      newOfferMessage: automation.newOfferMessage,
    },
    automation,
  });
  const provider = getWhatsAppProviderReadiness();
  const connection = getBusinessWhatsAppConnectionReadiness({
    credentialPresent: Boolean(credential),
    senderReady: Boolean(
      credential?.wabaId?.trim() && credential.phoneNumberId.trim(),
    ),
    providerReady: provider.providerReady,
    hasEnabledMessages: templateReadiness.hasEnabledMessages,
    templatesReady: templateReadiness.ready,
  });

  return {
    state: connection.state,
    deliveryReady:
      connection.automaticDeliveryReady && !automation.paused,
  };
}
