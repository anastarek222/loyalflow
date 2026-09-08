import {
  buildWhatsAppUrl,
  renderWhatsAppTemplate,
} from "@/lib/whatsapp-templates";

export type CampaignSuggestion = {
  trigger: "WELCOME" | "BALANCE_UPDATED" | "REWARD_READY";
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
  // Retained for call-site compatibility. One-away no longer has its own
  // platform-authored WhatsApp copy; it reuses the Owner's balance message.
  isOneLoyaltyActionAway: boolean;
};

function configuredTemplate(value: string | null | undefined) {
  return value?.trim() ? value : null;
}

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
        description: "أرسل نفس رسالة الترحيب المحفوظة لهذا النشاط.",
        button: "إرسال رسالة الترحيب",
        url,
      };
    case "REWARD_READY":
      return {
        trigger,
        title: "المكافأة أصبحت جاهزة 🎁",
        description: "أرسل نفس رسالة المكافأة المحفوظة لهذا النشاط.",
        button: "إرسال رسالة المكافأة",
        url,
      };
    case "BALANCE_UPDATED":
      return {
        trigger,
        title: "تم تحديث رصيد العميل",
        description: "أرسل نفس رسالة تحديث الرصيد المحفوظة لهذا النشاط.",
        button: "إرسال تحديث الرصيد",
        url,
      };
  }
}

/**
 * Produces a staff-reviewed manual WhatsApp handoff from the exact same three
 * Business-scoped Owner messages used by automatic delivery. Blank Owner copy
 * means there is no manual suggestion for that case either; Tanee never creates
 * a fourth or fallback WhatsApp message.
 */
export function getCampaignSuggestion(
  input: CampaignSuggestionInput
): CampaignSuggestion | null {
  const welcome = configuredTemplate(input.templates.welcome);
  const balance = configuredTemplate(input.templates.balance);
  const reward = configuredTemplate(input.templates.reward);

  if (input.operation === "created") {
    return welcome
      ? buildSuggestion("WELCOME", input.phone, welcome, input.context)
      : null;
  }

  if (input.operation === "earned" && input.rewardAvailable) {
    return reward
      ? buildSuggestion("REWARD_READY", input.phone, reward, input.context)
      : null;
  }

  if (
    input.operation === "earned" ||
    input.operation === "redeemed" ||
    input.operation === "adjusted"
  ) {
    return balance
      ? buildSuggestion("BALANCE_UPDATED", input.phone, balance, input.context)
      : null;
  }

  return null;
}
