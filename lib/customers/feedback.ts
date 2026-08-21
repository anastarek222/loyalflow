import type { SupportedLocale } from "@/lib/i18n/config";

export const CUSTOMER_FEEDBACK_CODES = [
  "invalid",
  "phone",
  "duplicate",
  "plan-limit",
  "subscription-restricted",
] as const;

export type CustomerFeedbackCode = (typeof CUSTOMER_FEEDBACK_CODES)[number];

const customerFeedbackCodeSet = new Set<string>(CUSTOMER_FEEDBACK_CODES);

export function parseCustomerFeedbackCode(
  value: string | null | undefined,
): CustomerFeedbackCode | null {
  return value && customerFeedbackCodeSet.has(value)
    ? (value as CustomerFeedbackCode)
    : null;
}

export function customerFeedbackUrl(
  slug: string,
  code: CustomerFeedbackCode,
): string {
  const parameters = new URLSearchParams({ error: code });
  return `/businesses/${slug}/customers?${parameters.toString()}`;
}

const planLimitMessage: Record<SupportedLocale, string> = {
  en: "You’ve reached the customer limit for your current plan. Upgrade your plan to add more customers.",
  ar: "لقد وصلت إلى الحد الأقصى للعملاء في باقتك الحالية. قم بترقية الباقة لإضافة المزيد من العملاء.",
};

export function getCustomerPlanLimitMessage(locale: SupportedLocale): string {
  return planLimitMessage[locale];
}
