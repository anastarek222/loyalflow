// Automatic WhatsApp copy is intentionally Owner-authored per Business.
// These legacy fallback keys remain for callers that need a string value, but
// they must never introduce platform-authored message wording.
export const DEFAULT_WHATSAPP_TEMPLATES = {
  welcome: "",
  balance: "",
  reward: "",
} as const;

export const SUGGESTED_WHATSAPP_TEMPLATES = {
  AR: {
    WELCOME:
      "أهلًا {customer} 👋 تم تسجيلك في برنامج الولاء الخاص بـ {business}. رصيدك الحالي: {balance} {unit}. كارتك: {card_link}",
    BALANCE_UPDATED:
      "أهلًا {customer}، تم تحديث رصيدك لدى {business}. رصيدك الحالي: {balance} {unit}. متبقي لك {remaining} للوصول إلى المكافأة. {card_link}",
    REWARD_READY:
      "مبروك يا {customer} 🎉 مكافأتك أصبحت جاهزة لدى {business}: {reward}. اعرض كارتك عند الزيارة للاستبدال: {card_link}",
    REWARD_REDEEMED:
      "تم استخدام مكافأتك بنجاح لدى {business}: {reward}. رصيدك الحالي: {balance} {unit}. شكرًا لزيارتك ❤️",
    NEW_REWARD:
      "يوجد مكافأة جديدة من {business} 🎁 {reward}. تابع رصيدك ومكافآتك من هنا: {card_link}",
    NEW_OFFER:
      "عرض جديد من {business} ✨ افتح كارتك لمعرفة تفاصيل العرض: {card_link}",
  },
  EN: {
    WELCOME:
      "Hi {customer} 👋 You are now enrolled in {business}'s loyalty programme. Your current balance is {balance} {unit}. Your card: {card_link}",
    BALANCE_UPDATED:
      "Hi {customer}, your balance at {business} was updated. You now have {balance} {unit}, with {remaining} remaining until your reward. {card_link}",
    REWARD_READY:
      "Congratulations {customer} 🎉 Your reward is ready at {business}: {reward}. Show your card on your next visit to redeem it: {card_link}",
    REWARD_REDEEMED:
      "Your reward was redeemed successfully at {business}: {reward}. Your current balance is {balance} {unit}. Thank you for visiting ❤️",
    NEW_REWARD:
      "A new reward is available from {business} 🎁 {reward}. Follow your balance and rewards here: {card_link}",
    NEW_OFFER:
      "A new offer is available from {business} ✨ Open your card to view the offer: {card_link}",
  },
} as const;

export type SuggestedWhatsAppTemplateEvent =
  keyof (typeof SUGGESTED_WHATSAPP_TEMPLATES)["EN"];

export function getSuggestedWhatsAppTemplate(
  language: "AR" | "EN",
  event: SuggestedWhatsAppTemplateEvent,
) {
  return SUGGESTED_WHATSAPP_TEMPLATES[language][event];
}

type WhatsAppTemplateContext = {
  customer: string;
  business: string;
  balance: number;
  unit: string;
  reward: string;
  cardLink: string;
  remaining: number;
};

const META_TEMPLATE_EXAMPLE_BY_TOKEN = {
  customer: "Ali",
  business: "Tanee Demo",
  balance: "12",
  unit: "points",
  reward: "Free coffee",
  card_link: "https://example.com/card/demo",
  remaining: "3",
} as const;

type WhatsAppTemplateToken = keyof typeof META_TEMPLATE_EXAMPLE_BY_TOKEN;

function getWhatsAppTemplateReplacements(context: WhatsAppTemplateContext) {
  return {
    customer: context.customer,
    business: context.business,
    balance: String(context.balance),
    unit: context.unit,
    reward: context.reward,
    card_link: context.cardLink,
    remaining: String(context.remaining),
  };
}

export function renderWhatsAppTemplate(
  template: string,
  context: WhatsAppTemplateContext
) {
  const replacements = getWhatsAppTemplateReplacements(context);

  return template.replace(
    /\{([a-z_]+)\}/g,
    (match, key: string) => {
      if (
        Object.prototype.hasOwnProperty.call(
          replacements,
          key
        )
      ) {
        return replacements[
          key as keyof typeof replacements
        ];
      }

      return match;
    }
  );
}

export function renderWhatsAppTemplateParameters(
  template: string,
  context: WhatsAppTemplateContext
) {
  const replacements = getWhatsAppTemplateReplacements(context);
  const parameters: string[] = [];

  template.replace(
    /\{([a-z_]+)\}/g,
    (match, key: string) => {
      if (
        Object.prototype.hasOwnProperty.call(
          replacements,
          key
        )
      ) {
        parameters.push(
          replacements[
            key as keyof typeof replacements
          ]
        );
      }

      return match;
    }
  );

  return parameters;
}

export function compileWhatsAppTemplateForMeta(template: string) {
  const invalidTokens = new Set<string>();
  const exampleParameters: string[] = [];
  let parameterIndex = 0;

  const bodyText = template.trim().replace(
    /\{([^{}]+)\}/g,
    (match, rawKey: string) => {
      const key = rawKey.trim();
      if (
        !Object.prototype.hasOwnProperty.call(
          META_TEMPLATE_EXAMPLE_BY_TOKEN,
          key,
        )
      ) {
        invalidTokens.add(key || match);
        return match;
      }

      parameterIndex += 1;
      exampleParameters.push(
        META_TEMPLATE_EXAMPLE_BY_TOKEN[key as WhatsAppTemplateToken],
      );
      return `{{${parameterIndex}}}`;
    },
  );

  if (invalidTokens.size > 0) {
    return {
      ok: false,
      invalidTokens: [...invalidTokens],
    } as const;
  }

  return {
    ok: true,
    bodyText,
    exampleParameters,
  } as const;
}

export function normalizeWhatsAppPhone(
  phone: string
) {
  let digits =
    phone.replace(/\D/g, "");

  // 002010... -> 2010...
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Egyptian local number:
  // 01012345678 -> 201012345678
  if (
    /^01[0125]\d{8}$/.test(digits)
  ) {
    digits =
      `20${digits.slice(1)}`;
  }

  return digits;
}

export function buildWhatsAppUrl(
  phone: string,
  message: string
) {
  const normalizedPhone =
    normalizeWhatsAppPhone(phone);

  const encodedMessage =
    encodeURIComponent(message);

  if (!normalizedPhone) {
    return (
      "https://wa.me/?text=" +
      encodedMessage
    );
  }

  return (
    `https://wa.me/${normalizedPhone}` +
    `?text=${encodedMessage}`
  );
}
