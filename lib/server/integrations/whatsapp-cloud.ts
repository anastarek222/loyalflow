import prisma from "@/lib/prisma";
import { getRewardAvailability } from "@/lib/rewards/availability";
import {
  isAutomaticCustomerMessageEvent,
  isCustomerMessagePayload,
  type AutomaticCustomerMessageEvent,
} from "@/lib/server/integrations/customer-messaging";
import {
  getBusinessWhatsAppTemplateBinding,
  hashBusinessWhatsAppTemplate,
} from "@/lib/server/integrations/business-whatsapp-template-bindings";
import { getBusinessWhatsAppCredential } from "@/lib/server/integrations/business-whatsapp-credentials";
import { getBusinessWhatsAppAutomationSettings } from "@/lib/server/integrations/business-whatsapp-automation-settings";
import { isWhatsAppAutomationEventEnabled } from "@/lib/server/integrations/whatsapp-automation-policy";
import { decryptBusinessWhatsAppAccessToken } from "@/lib/server/integrations/whatsapp-credential-crypto";
import {
  normalizeWhatsAppPhone,
  renderWhatsAppTemplateParameters,
} from "@/lib/whatsapp-templates";

type WhatsAppDeliveryResult =
  | Readonly<{ status: "success"; providerMessageId?: string }>
  | Readonly<{ status: "failure"; reason: string; retryable: boolean }>;

function normalizeRecipientPhone(phone: string) {
  const digits = normalizeWhatsAppPhone(phone);
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

function customerName(firstName: string, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || firstName;
}

function getOwnerMessageTemplate(
  event: AutomaticCustomerMessageEvent,
  messages: {
    whatsappWelcomeMessage: string | null;
    whatsappBalanceMessage: string | null;
    whatsappRewardMessage: string | null;
    whatsappRedeemedMessage: string | null;
    newRewardMessage: string | null;
    newOfferMessage: string | null;
  },
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
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

export function extractWhatsAppProviderMessageId(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const messages = (payload as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length < 1) return null;
  const first = messages[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return null;
  const id = (first as { id?: unknown }).id;
  if (typeof id !== "string") return null;
  const normalized = id.trim();
  return normalized.length >= 1 && normalized.length <= 512 ? normalized : null;
}

/**
 * Sends the Owner-authored business message through the exact provider-owned,
 * approved Meta template binding for this Business/WABA/event/language/content.
 * Missing/revoked consent or a paused/disabled automation is a successful no-op
 * so stale queued jobs can never bypass current Owner controls. Missing Owner
 * copy or provider approval is terminal and is never replaced by platform copy.
 */
export async function sendWhatsAppCustomerNotificationSafely(
  businessId: string,
  payloadValue: unknown,
): Promise<WhatsAppDeliveryResult> {
  if (!isCustomerMessagePayload(payloadValue)) {
    return {
      status: "failure",
      reason: "WHATSAPP_INVALID_PAYLOAD",
      retryable: false,
    };
  }
  const payload = payloadValue;

  if (!isAutomaticCustomerMessageEvent(payload.event)) {
    return {
      status: "failure",
      reason: "WHATSAPP_EVENT_NOT_AUTOMATIC",
      retryable: false,
    };
  }

  const automationSettings = await getBusinessWhatsAppAutomationSettings(
    prisma,
    businessId,
  );
  if (
    !automationSettings ||
    !isWhatsAppAutomationEventEnabled(automationSettings, payload.event)
  ) {
    return { status: "success" };
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: payload.customerId,
      businessId,
      isActive: true,
    },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      balance: true,
      publicToken: true,
      whatsappOptInAt: true,
      business: {
        select: {
          name: true,
          unitName: true,
          rewardName: true,
          rewardThreshold: true,
          cardDefaultLanguage: true,
          whatsappWelcomeMessage: true,
          whatsappBalanceMessage: true,
          whatsappRewardMessage: true,
          whatsappRedeemedMessage: true,
          rewards: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              cost: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!customer || !customer.whatsappOptInAt) {
    return { status: "success" };
  }

  const to = normalizeRecipientPhone(customer.phone);
  if (!to) {
    return {
      status: "failure",
      reason: "WHATSAPP_INVALID_PHONE",
      retryable: false,
    };
  }

  const ownerMessageTemplate = getOwnerMessageTemplate(payload.event, {
    ...customer.business,
    newRewardMessage: automationSettings.newRewardMessage,
    newOfferMessage: automationSettings.newOfferMessage,
  });
  if (!ownerMessageTemplate) {
    return {
      status: "failure",
      reason: "WHATSAPP_OWNER_MESSAGE_NOT_CONFIGURED",
      retryable: false,
    };
  }

  const businessCredential = await getBusinessWhatsAppCredential(
    prisma,
    businessId,
  );
  if (!businessCredential) {
    return {
      status: "failure",
      reason: "WHATSAPP_NOT_CONFIGURED",
      retryable: false,
    };
  }
  if (!businessCredential.wabaId) {
    return {
      status: "failure",
      reason: "WHATSAPP_WABA_NOT_CONFIGURED",
      retryable: false,
    };
  }

  const binding = await getBusinessWhatsAppTemplateBinding(prisma, {
    businessId,
    event: payload.event,
    language: customer.business.cardDefaultLanguage,
  });
  if (!binding) {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_BINDING_NOT_CONFIGURED",
      retryable: false,
    };
  }
  if (binding.wabaId !== businessCredential.wabaId) {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_ACCOUNT_MISMATCH",
      retryable: false,
    };
  }
  if (binding.approvalStatus !== "APPROVED") {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_NOT_APPROVED",
      retryable: false,
    };
  }
  if (
    binding.contentSha256 !==
    hashBusinessWhatsAppTemplate(ownerMessageTemplate)
  ) {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_CONTENT_MISMATCH",
      retryable: false,
    };
  }

  const templateName = binding.templateName.trim();
  const languageCode = binding.templateLanguageCode.trim();
  if (!templateName || !languageCode) {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_BINDING_INVALID",
      retryable: false,
    };
  }

  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  const phoneNumberId = businessCredential.phoneNumberId;
  let accessToken: string;
  try {
    accessToken = decryptBusinessWhatsAppAccessToken(
      businessCredential.accessTokenCiphertext,
    );
  } catch {
    return {
      status: "failure",
      reason: "WHATSAPP_BUSINESS_CREDENTIAL_INVALID",
      retryable: false,
    };
  }

  if (!apiVersion || !phoneNumberId || !accessToken) {
    return {
      status: "failure",
      reason: "WHATSAPP_NOT_CONFIGURED",
      retryable: false,
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const balance = payload.balance ?? customer.balance;
  const rewardAvailability = getRewardAvailability({
    customerActive: true,
    balance,
    rewardThreshold: customer.business.rewardThreshold,
    fallbackReward: {
      name: customer.business.rewardName,
      cost: customer.business.rewardThreshold,
    },
    catalogueRewards: customer.business.rewards,
  });
  const cardUrl = `${appUrl}/card/${customer.publicToken}`;
  const bodyParameters = renderWhatsAppTemplateParameters(
    ownerMessageTemplate,
    {
      customer: customerName(customer.firstName, customer.lastName),
      business: customer.business.name,
      balance,
      unit: customer.business.unitName,
      reward: payload.rewardName ?? rewardAvailability.defaultReward.name,
      remaining: rewardAvailability.remaining,
      cardLink: cardUrl,
    },
  );

  try {
    const response = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(apiVersion)}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(bodyParameters.length === 0
              ? {}
              : {
                  components: [
                    {
                      type: "body",
                      parameters: bodyParameters.map((text) => ({
                        type: "text",
                        text,
                      })),
                    },
                  ],
                }),
          },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (response.ok) {
      let responsePayload: unknown = null;
      try {
        responsePayload = await response.json();
      } catch {
        // API acceptance is authoritative. Missing observability metadata must
        // never turn an accepted send into a retry that can duplicate a message.
      }
      const providerMessageId = extractWhatsAppProviderMessageId(responsePayload);
      return providerMessageId
        ? { status: "success", providerMessageId }
        : { status: "success" };
    }
    const retryable = response.status === 429 || response.status >= 500;
    return {
      status: "failure",
      reason: `WHATSAPP_HTTP_${response.status}`,
      retryable,
    };
  } catch {
    return {
      status: "failure",
      reason: "WHATSAPP_NETWORK_ERROR",
      retryable: true,
    };
  }
}
