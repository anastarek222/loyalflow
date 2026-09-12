import { createHash } from "node:crypto";

import prisma from "@/lib/prisma";
import type { AutomaticCustomerMessageEvent } from "@/lib/server/integrations/customer-messaging";
import {
  getBusinessWhatsAppTemplateBinding,
  hashBusinessWhatsAppTemplate,
  ownerMessageForAutomaticEvent,
  type BusinessWhatsAppTemplateBinding,
  type WhatsAppTemplateApprovalStatus,
} from "@/lib/server/integrations/business-whatsapp-template-bindings";
import { getBusinessWhatsAppCredential } from "@/lib/server/integrations/business-whatsapp-credentials";
import { getBusinessWhatsAppAutomationSettings } from "@/lib/server/integrations/business-whatsapp-automation-settings";
import { decryptBusinessWhatsAppAccessToken } from "@/lib/server/integrations/whatsapp-credential-crypto";
import { compileWhatsAppTemplateForMeta } from "@/lib/whatsapp-templates";

type MetaTemplateResult =
  | Readonly<{
      status: "success";
      approvalStatus: WhatsAppTemplateApprovalStatus;
      templateName: string;
      providerTemplateId: string | null;
    }>
  | Readonly<{
      status: "failure";
      reason: string;
      retryable: boolean;
    }>;

type MetaTemplateRecord = Readonly<{
  id: string | null;
  name: string;
  language: string;
  status: WhatsAppTemplateApprovalStatus;
  bodyText: string | null;
}>;

const LANGUAGE_CODE = {
  AR: "ar",
  EN: "en_US",
} as const;

const EVENT_NAME: Record<AutomaticCustomerMessageEvent, string> = {
  WELCOME: "welcome",
  BALANCE_UPDATED: "balance",
  REWARD_READY: "reward_ready",
  REWARD_REDEEMED: "reward_redeemed",
  NEW_REWARD: "new_reward",
  NEW_OFFER: "new_offer",
};

const EVENT_CATEGORY: Record<AutomaticCustomerMessageEvent, "MARKETING" | "UTILITY"> = {
  WELCOME: "MARKETING",
  BALANCE_UPDATED: "UTILITY",
  REWARD_READY: "MARKETING",
  REWARD_REDEEMED: "UTILITY",
  NEW_REWARD: "MARKETING",
  NEW_OFFER: "MARKETING",
};

function normalizeApprovalStatus(value: unknown): WhatsAppTemplateApprovalStatus {
  return value === "APPROVED" || value === "PENDING" || value === "REJECTED"
    ? value
    : "UNKNOWN";
}

function bodyTextFromComponents(value: unknown) {
  if (!Array.isArray(value)) return null;
  for (const component of value) {
    if (!component || typeof component !== "object" || Array.isArray(component)) {
      continue;
    }
    const candidate = component as Record<string, unknown>;
    if (String(candidate.type ?? "").toUpperCase() !== "BODY") continue;
    return typeof candidate.text === "string" ? candidate.text : null;
  }
  return null;
}

function parseMetaTemplateRecord(value: unknown): MetaTemplateRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.name !== "string" || typeof candidate.language !== "string") {
    return null;
  }
  return {
    id: typeof candidate.id === "string" ? candidate.id : null,
    name: candidate.name,
    language: candidate.language,
    status: normalizeApprovalStatus(candidate.status),
    bodyText: bodyTextFromComponents(candidate.components),
  };
}

function businessTemplateName(input: {
  businessId: string;
  event: AutomaticCustomerMessageEvent;
  language: "AR" | "EN";
  contentSha256: string;
}) {
  const businessHash = createHash("sha256")
    .update(input.businessId, "utf8")
    .digest("hex")
    .slice(0, 10);
  return `tanee_${EVENT_NAME[input.event]}_${input.language.toLowerCase()}_${businessHash}_${input.contentSha256.slice(0, 16)}`;
}

async function providerRequest(
  url: string,
  accessToken: string,
  init?: RequestInit,
) {
  try {
    const response = await fetch(url, {
      ...init,
      headers: init?.body
        ? {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          }
        : { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // The HTTP status remains authoritative for retry classification.
    }
    return { response, payload } as const;
  } catch {
    return null;
  }
}

async function fetchTemplateByName(input: {
  apiVersion: string;
  wabaId: string;
  accessToken: string;
  templateName: string;
  languageCode: string;
}) {
  const url = new URL(
    `https://graph.facebook.com/${encodeURIComponent(input.apiVersion)}/${encodeURIComponent(input.wabaId)}/message_templates`,
  );
  url.searchParams.set("name", input.templateName);
  url.searchParams.set("fields", "id,name,language,status,components");

  const result = await providerRequest(url.toString(), input.accessToken);
  if (!result) {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_NETWORK_ERROR",
      retryable: true,
    } as const;
  }
  if (!result.response.ok) {
    return {
      status: "failure",
      reason: `WHATSAPP_META_TEMPLATE_HTTP_${result.response.status}`,
      retryable: result.response.status === 429 || result.response.status >= 500,
    } as const;
  }

  if (!result.payload || typeof result.payload !== "object" || Array.isArray(result.payload)) {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_INVALID_RESPONSE",
      retryable: false,
    } as const;
  }
  const data = (result.payload as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_INVALID_RESPONSE",
      retryable: false,
    } as const;
  }

  const match = data
    .map(parseMetaTemplateRecord)
    .find(
      (record): record is MetaTemplateRecord =>
        Boolean(
          record &&
            record.name === input.templateName &&
            record.language === input.languageCode,
        ),
    );

  return { status: "success", template: match ?? null } as const;
}

async function persistProviderTemplateBinding(input: {
  businessId: string;
  wabaId: string;
  event: AutomaticCustomerMessageEvent;
  language: "AR" | "EN";
  templateName: string;
  templateLanguageCode: string;
  contentSha256: string;
  approvalStatus: WhatsAppTemplateApprovalStatus;
  providerTemplateId: string | null;
}) {
  await prisma.$executeRaw`
    INSERT INTO "BusinessWhatsAppTemplateBinding" (
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
    ) VALUES (
      ${input.businessId},
      ${input.wabaId},
      ${input.event},
      ${input.language},
      ${input.templateName},
      ${input.templateLanguageCode},
      ${input.contentSha256},
      ${input.approvalStatus},
      ${input.providerTemplateId},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("businessId", "event", "language") DO UPDATE SET
      "wabaId" = EXCLUDED."wabaId",
      "templateName" = EXCLUDED."templateName",
      "templateLanguageCode" = EXCLUDED."templateLanguageCode",
      "contentSha256" = EXCLUDED."contentSha256",
      "approvalStatus" = EXCLUDED."approvalStatus",
      "providerTemplateId" = EXCLUDED."providerTemplateId",
      "providerStatusUpdatedAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

async function persistBindingStatus(
  binding: BusinessWhatsAppTemplateBinding,
  approvalStatus: WhatsAppTemplateApprovalStatus,
  providerTemplateId = binding.providerTemplateId,
) {
  if (!binding.wabaId) return;
  await persistProviderTemplateBinding({
    businessId: binding.businessId,
    wabaId: binding.wabaId,
    event: binding.event,
    language: binding.language,
    templateName: binding.templateName,
    templateLanguageCode: binding.templateLanguageCode,
    contentSha256: binding.contentSha256,
    approvalStatus,
    providerTemplateId,
  });
}

async function ownerMessagesForBusiness(businessId: string) {
  const [business, automation] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: {
        cardDefaultLanguage: true,
        whatsappWelcomeMessage: true,
        whatsappBalanceMessage: true,
        whatsappRewardMessage: true,
        whatsappRedeemedMessage: true,
      },
    }),
    getBusinessWhatsAppAutomationSettings(prisma, businessId),
  ]);
  if (!business || !automation) return null;
  return {
    business,
    messages: {
      whatsappWelcomeMessage: business.whatsappWelcomeMessage,
      whatsappBalanceMessage: business.whatsappBalanceMessage,
      whatsappRewardMessage: business.whatsappRewardMessage,
      whatsappRedeemedMessage: business.whatsappRedeemedMessage,
      newRewardMessage: automation.newRewardMessage,
      newOfferMessage: automation.newOfferMessage,
    },
  } as const;
}

async function providerContext(
  businessId: string,
  event: AutomaticCustomerMessageEvent,
) {
  const [ownerContext, credential] = await Promise.all([
    ownerMessagesForBusiness(businessId),
    getBusinessWhatsAppCredential(prisma, businessId),
  ]);
  if (!ownerContext) {
    return { status: "failure", reason: "WHATSAPP_BUSINESS_NOT_FOUND", retryable: false } as const;
  }
  if (!credential?.wabaId) {
    return { status: "failure", reason: "WHATSAPP_WABA_NOT_CONFIGURED", retryable: false } as const;
  }

  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() ?? "";
  if (!apiVersion) {
    return { status: "failure", reason: "WHATSAPP_GRAPH_API_NOT_CONFIGURED", retryable: false } as const;
  }

  let accessToken: string;
  try {
    accessToken = decryptBusinessWhatsAppAccessToken(credential.accessTokenCiphertext);
  } catch {
    return { status: "failure", reason: "WHATSAPP_BUSINESS_CREDENTIAL_INVALID", retryable: false } as const;
  }

  const ownerTemplate = ownerMessageForAutomaticEvent(event, ownerContext.messages);
  if (!ownerTemplate) {
    return { status: "failure", reason: "WHATSAPP_OWNER_MESSAGE_NOT_CONFIGURED", retryable: false } as const;
  }

  const compiled = compileWhatsAppTemplateForMeta(ownerTemplate);
  if (!compiled.ok) {
    return { status: "failure", reason: "WHATSAPP_OWNER_MESSAGE_UNSUPPORTED_TOKEN", retryable: false } as const;
  }

  const language = ownerContext.business.cardDefaultLanguage;
  const languageCode = LANGUAGE_CODE[language];
  const contentSha256 = hashBusinessWhatsAppTemplate(ownerTemplate);
  const templateName = businessTemplateName({
    businessId,
    event,
    language,
    contentSha256,
  });

  return {
    status: "success",
    apiVersion,
    accessToken,
    wabaId: credential.wabaId,
    language,
    languageCode,
    compiled,
    contentSha256,
    templateName,
  } as const;
}

async function persistExistingTemplate(input: {
  businessId: string;
  event: AutomaticCustomerMessageEvent;
  wabaId: string;
  language: "AR" | "EN";
  languageCode: string;
  contentSha256: string;
  templateName: string;
  expectedBodyText: string;
  template: MetaTemplateRecord;
}): Promise<MetaTemplateResult> {
  if (input.template.bodyText !== input.expectedBodyText) {
    await persistProviderTemplateBinding({
      businessId: input.businessId,
      wabaId: input.wabaId,
      event: input.event,
      language: input.language,
      templateName: input.templateName,
      templateLanguageCode: input.languageCode,
      contentSha256: input.contentSha256,
      approvalStatus: "UNKNOWN",
      providerTemplateId: input.template.id,
    });
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_NAME_COLLISION",
      retryable: false,
    };
  }
  await persistProviderTemplateBinding({
    businessId: input.businessId,
    wabaId: input.wabaId,
    event: input.event,
    language: input.language,
    templateName: input.templateName,
    templateLanguageCode: input.languageCode,
    contentSha256: input.contentSha256,
    approvalStatus: input.template.status,
    providerTemplateId: input.template.id,
  });
  return {
    status: "success",
    approvalStatus: input.template.status,
    templateName: input.templateName,
    providerTemplateId: input.template.id,
  };
}

export async function submitBusinessWhatsAppTemplateToMeta(
  businessId: string,
  event: AutomaticCustomerMessageEvent,
): Promise<MetaTemplateResult> {
  const context = await providerContext(businessId, event);
  if (context.status === "failure") return context;

  const existing = await fetchTemplateByName({
    apiVersion: context.apiVersion,
    wabaId: context.wabaId,
    accessToken: context.accessToken,
    templateName: context.templateName,
    languageCode: context.languageCode,
  });
  if (existing.status === "failure") return existing;
  if (existing.template) {
    return persistExistingTemplate({
      businessId,
      event,
      wabaId: context.wabaId,
      language: context.language,
      languageCode: context.languageCode,
      contentSha256: context.contentSha256,
      templateName: context.templateName,
      expectedBodyText: context.compiled.bodyText,
      template: existing.template,
    });
  }

  const created = await providerRequest(
    `https://graph.facebook.com/${encodeURIComponent(context.apiVersion)}/${encodeURIComponent(context.wabaId)}/message_templates`,
    context.accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        name: context.templateName,
        language: context.languageCode,
        category: EVENT_CATEGORY[event],
        components: [
          {
            type: "BODY",
            text: context.compiled.bodyText,
            ...(context.compiled.exampleParameters.length === 0
              ? {}
              : {
                  example: {
                    body_text: [context.compiled.exampleParameters],
                  },
                }),
          },
        ],
      }),
    },
  );
  if (!created) {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_NETWORK_ERROR",
      retryable: true,
    };
  }
  if (!created.response.ok) {
    const reconciled = await fetchTemplateByName({
      apiVersion: context.apiVersion,
      wabaId: context.wabaId,
      accessToken: context.accessToken,
      templateName: context.templateName,
      languageCode: context.languageCode,
    });
    if (reconciled.status === "success" && reconciled.template) {
      return persistExistingTemplate({
        businessId,
        event,
        wabaId: context.wabaId,
        language: context.language,
        languageCode: context.languageCode,
        contentSha256: context.contentSha256,
        templateName: context.templateName,
        expectedBodyText: context.compiled.bodyText,
        template: reconciled.template,
      });
    }
    return {
      status: "failure",
      reason: `WHATSAPP_META_TEMPLATE_HTTP_${created.response.status}`,
      retryable: created.response.status === 429 || created.response.status >= 500,
    };
  }

  const payload =
    created.payload && typeof created.payload === "object" && !Array.isArray(created.payload)
      ? (created.payload as Record<string, unknown>)
      : null;
  const providerTemplateId =
    payload && typeof payload.id === "string" ? payload.id : null;
  const approvalStatus = normalizeApprovalStatus(payload?.status);

  await persistProviderTemplateBinding({
    businessId,
    wabaId: context.wabaId,
    event,
    language: context.language,
    templateName: context.templateName,
    templateLanguageCode: context.languageCode,
    contentSha256: context.contentSha256,
    approvalStatus,
    providerTemplateId,
  });

  return {
    status: "success",
    approvalStatus,
    templateName: context.templateName,
    providerTemplateId,
  };
}

export async function refreshBusinessWhatsAppTemplateFromMeta(
  businessId: string,
  event: AutomaticCustomerMessageEvent,
): Promise<MetaTemplateResult> {
  const [credential, ownerContext] = await Promise.all([
    getBusinessWhatsAppCredential(prisma, businessId),
    ownerMessagesForBusiness(businessId),
  ]);
  if (!ownerContext) {
    return { status: "failure", reason: "WHATSAPP_BUSINESS_NOT_FOUND", retryable: false };
  }
  if (!credential?.wabaId) {
    return { status: "failure", reason: "WHATSAPP_WABA_NOT_CONFIGURED", retryable: false };
  }

  const binding = await getBusinessWhatsAppTemplateBinding(prisma, {
    businessId,
    event,
    language: ownerContext.business.cardDefaultLanguage,
  });
  if (!binding) {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_BINDING_NOT_CONFIGURED",
      retryable: false,
    };
  }
  if (binding.wabaId !== credential.wabaId) {
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_ACCOUNT_MISMATCH",
      retryable: false,
    };
  }

  const ownerTemplate = ownerMessageForAutomaticEvent(event, ownerContext.messages);
  if (!ownerTemplate) {
    await persistBindingStatus(binding, "UNKNOWN");
    return {
      status: "failure",
      reason: "WHATSAPP_OWNER_MESSAGE_NOT_CONFIGURED",
      retryable: false,
    };
  }
  const currentContentSha256 = hashBusinessWhatsAppTemplate(ownerTemplate);
  if (currentContentSha256 !== binding.contentSha256) {
    await persistBindingStatus(binding, "UNKNOWN");
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_CONTENT_MISMATCH",
      retryable: false,
    };
  }
  const compiled = compileWhatsAppTemplateForMeta(ownerTemplate);
  if (!compiled.ok) {
    await persistBindingStatus(binding, "UNKNOWN");
    return {
      status: "failure",
      reason: "WHATSAPP_OWNER_MESSAGE_UNSUPPORTED_TOKEN",
      retryable: false,
    };
  }

  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() ?? "";
  if (!apiVersion) {
    return { status: "failure", reason: "WHATSAPP_GRAPH_API_NOT_CONFIGURED", retryable: false };
  }
  let accessToken: string;
  try {
    accessToken = decryptBusinessWhatsAppAccessToken(credential.accessTokenCiphertext);
  } catch {
    return { status: "failure", reason: "WHATSAPP_BUSINESS_CREDENTIAL_INVALID", retryable: false };
  }

  const fetched = await fetchTemplateByName({
    apiVersion,
    wabaId: credential.wabaId,
    accessToken,
    templateName: binding.templateName,
    languageCode: binding.templateLanguageCode,
  });
  if (fetched.status === "failure") return fetched;
  if (!fetched.template) {
    await persistBindingStatus(binding, "UNKNOWN");
    return {
      status: "success",
      approvalStatus: "UNKNOWN",
      templateName: binding.templateName,
      providerTemplateId: binding.providerTemplateId,
    };
  }
  if (fetched.template.bodyText !== compiled.bodyText) {
    await persistBindingStatus(
      binding,
      "UNKNOWN",
      fetched.template.id ?? binding.providerTemplateId,
    );
    return {
      status: "failure",
      reason: "WHATSAPP_META_TEMPLATE_CONTENT_MISMATCH",
      retryable: false,
    };
  }

  await persistBindingStatus(
    binding,
    fetched.template.status,
    fetched.template.id ?? binding.providerTemplateId,
  );

  return {
    status: "success",
    approvalStatus: fetched.template.status,
    templateName: binding.templateName,
    providerTemplateId: fetched.template.id ?? binding.providerTemplateId,
  };
}
