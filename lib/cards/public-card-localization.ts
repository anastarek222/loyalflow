import { getLanguageAttributes } from "@/lib/i18n";

/**
 * Public-card copy must follow the business setting, not caller-controlled
 * request values. This is shared by page metadata and the web app manifest.
 */
export function getPublicCardLocalization(
  cardDefaultLanguage: unknown,
  customerName: string
) {
  const attributes = getLanguageAttributes(cardDefaultLanguage);

  return {
    ...attributes,
    description:
      attributes.language === "AR"
        ? `بطاقة الولاء الرقمية الخاصة بـ ${customerName}`
        : `Your digital loyalty card for ${customerName}.`,
  };
}
