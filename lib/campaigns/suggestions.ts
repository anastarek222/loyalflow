import {
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_TEMPLATES,
  renderWhatsAppTemplate,
} from "@/lib/whatsapp-templates";

export type CampaignSuggestion = {
  trigger:
    | "WELCOME"
    | "BALANCE_UPDATED"
    | "REWARD_READY"
    | "ONE_AWAY";
  title: string;
  description: string;
  button: string;
  url: string;
};

type CampaignContext = {
  customer: string;
  business: string;
  balance: number;
  unit: string;
  reward: string;
  cardLink: string;
  remaining: number;
};

type CampaignTemplateConfig = {
  welcome?: string | null;
  balance?: string | null;
  reward?: string | null;
};

type CampaignSuggestionInput = {
  operation: string | undefined;
  phone: string;
  context: CampaignContext;
  templates: CampaignTemplateConfig;
  rewardAvailable: boolean;
  isOneLoyaltyActionAway: boolean;
};

const oneAwayTemplate =
  "أهلاً {customer} 👋\n\n" +
  "أنت على بُعد خطوة واحدة من {reward} لدى {business}.\n" +
  "متبقي {remaining} {unit}.\n\n" +
  "تابع كارتك من هنا:\n{card_link}";

function buildSuggestion(
  trigger: CampaignSuggestion["trigger"],
  phone: string,
  template: string,
  context: CampaignContext
): CampaignSuggestion {
  const url = buildWhatsAppUrl(
    phone,
    renderWhatsAppTemplate(template, context)
  );

  switch (trigger) {
    case "WELCOME":
      return {
        trigger,
        title: "تم إنشاء العميل بنجاح 👋",
        description: "أرسل رسالة الترحيب ورابط كارت الولاء للعميل الجديد.",
        button: "إرسال رسالة الترحيب",
        url,
      };
    case "REWARD_READY":
      return {
        trigger,
        title: "المكافأة أصبحت جاهزة 🎁",
        description: "أرسل للعميل رسالة المكافأة الجاهزة للاستلام.",
        button: "إرسال رسالة المكافأة",
        url,
      };
    case "ONE_AWAY":
      return {
        trigger,
        title: "العميل على بُعد خطوة واحدة ✨",
        description: "ذكّر العميل بأن مكافأته قريبة لتشجيع الزيارة التالية.",
        button: "إرسال تذكير المكافأة",
        url,
      };
    case "BALANCE_UPDATED":
      return {
        trigger,
        title: "تم تحديث رصيد العميل",
        description: "أرسل للعميل رصيده الحالي والمتبقي للحصول على المكافأة.",
        button: "إرسال تحديث الرصيد",
        url,
      };
  }
}

/**
 * Produces a provider-independent, staff-reviewed campaign handoff. It does
 * not send a message or record a delivery; a persistent campaign model will
 * add those capabilities later.
 */
export function getCampaignSuggestion(
  input: CampaignSuggestionInput
): CampaignSuggestion | null {
  const templates = {
    welcome:
      input.templates.welcome ??
      DEFAULT_WHATSAPP_TEMPLATES.welcome,
    balance:
      input.templates.balance ??
      DEFAULT_WHATSAPP_TEMPLATES.balance,
    reward:
      input.templates.reward ??
      DEFAULT_WHATSAPP_TEMPLATES.reward,
  };

  if (input.operation === "created") {
    return buildSuggestion(
      "WELCOME",
      input.phone,
      templates.welcome,
      input.context
    );
  }

  if (input.operation === "earned" && input.rewardAvailable) {
    return buildSuggestion(
      "REWARD_READY",
      input.phone,
      templates.reward,
      input.context
    );
  }

  if (
    input.operation === "earned" &&
    input.isOneLoyaltyActionAway
  ) {
    return buildSuggestion(
      "ONE_AWAY",
      input.phone,
      oneAwayTemplate,
      input.context
    );
  }

  if (
    input.operation === "earned" ||
    input.operation === "redeemed" ||
    input.operation === "adjusted"
  ) {
    return buildSuggestion(
      "BALANCE_UPDATED",
      input.phone,
      templates.balance,
      input.context
    );
  }

  return null;
}
