// Automatic WhatsApp copy is intentionally Owner-authored per Business.
// These legacy fallback keys remain for callers that need a string value, but
// they must never introduce platform-authored message wording.
export const DEFAULT_WHATSAPP_TEMPLATES = {
  welcome: "",
  balance: "",
  reward: "",
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
