export const DEFAULT_WHATSAPP_TEMPLATES = {
  welcome:
    "أهلاً {customer} 👋\n\n" +
    "تم إنشاء كارت الولاء الخاص بك لدى {business}.\n" +
    "رصيدك الحالي: {balance} {unit}.\n\n" +
    "تابع رصيدك ومكافآتك من هنا:\n{card_link}",

  balance:
    "أهلاً {customer} 👋\n\n" +
    "تم تحديث رصيد الولاء الخاص بك لدى {business}.\n" +
    "رصيدك الحالي: {balance} {unit}.\n" +
    "متبقي {remaining} للحصول على {reward}.\n\n" +
    "تابع كارتك من هنا:\n{card_link}",

  reward:
    "مبروك يا {customer} 🎁\n\n" +
    "أصبحت مكافأتك متاحة لدى {business}.\n" +
    "المكافأة: {reward}.\n" +
    "رصيدك الحالي: {balance} {unit}.\n\n" +
    "افتح كارت الولاء من هنا:\n{card_link}",
} as const;

type WhatsAppTemplateContext = {
  customer: string;
  business: string;
  balance: number;
  unit: string;
  reward: string;
  cardLink: string;
  remaining: number;
};

export function renderWhatsAppTemplate(
  template: string,
  context: WhatsAppTemplateContext
) {
  const replacements = {
    customer: context.customer,
    business: context.business,
    balance: String(context.balance),
    unit: context.unit,
    reward: context.reward,
    card_link: context.cardLink,
    remaining: String(context.remaining),
  };

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

function normalizeWhatsAppPhone(
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
