import { isValidBusinessPhone } from "@/lib/business-profile";
import { loyaltyProgramFields, validateCountryProfile } from "@/lib/business/domain-validation";
import type { SupportedLocale } from "@/lib/i18n/config";
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";

export type OwnerOnboardingValidationCode =
  | "BUSINESS_NAME_INVALID"
  | "COUNTRY_INVALID"
  | "CURRENCY_INVALID"
  | "TIMEZONE_INVALID"
  | "PHONE_INVALID"
  | "LOYALTY_MODE_INVALID"
  | "LOYALTY_UNIT_INVALID"
  | "REWARD_NAME_INVALID"
  | "REWARD_THRESHOLD_INVALID"
  | "EARN_AMOUNT_INVALID";

export type OwnerOnboardingValidationField =
  | "name"
  | "countrySelector"
  | "currencyInput"
  | "timezoneInput"
  | "contactPhone"
  | "loyaltyMode"
  | "unitName"
  | "rewardName"
  | "rewardThreshold"
  | "earnAmount";

export type OwnerOnboardingFieldError = {
  code: OwnerOnboardingValidationCode;
  field: OwnerOnboardingValidationField;
  step: 0 | 1 | 2;
  message: string;
};

const messages: Record<SupportedLocale, Record<OwnerOnboardingValidationCode, string>> = {
  en: {
    BUSINESS_NAME_INVALID: "Enter a business name with at least 2 characters.",
    COUNTRY_INVALID: "Choose a country from the list.",
    CURRENCY_INVALID: "Enter a supported 3-letter currency code.",
    TIMEZONE_INVALID: "Enter a valid timezone for the selected country.",
    PHONE_INVALID: "Enter the phone in international format, for example +201212312746.",
    LOYALTY_MODE_INVALID: "Choose a supported loyalty mode.",
    LOYALTY_UNIT_INVALID: "Enter a loyalty unit name between 1 and 30 characters.",
    REWARD_NAME_INVALID: "Enter a reward name with at least 2 characters.",
    REWARD_THRESHOLD_INVALID: "Enter a reward target as a whole number of at least 1.",
    EARN_AMOUNT_INVALID: "Enter an earn amount as a whole number of at least 1.",
  },
  ar: {
    BUSINESS_NAME_INVALID: "أدخل اسم نشاط مكوّنًا من حرفين على الأقل.",
    COUNTRY_INVALID: "اختر دولة من القائمة.",
    CURRENCY_INVALID: "أدخل رمز عملة مدعومًا من 3 أحرف.",
    TIMEZONE_INVALID: "أدخل منطقة زمنية صحيحة للدولة المختارة.",
    PHONE_INVALID: "أدخل رقم الهاتف بصيغة دولية، مثل +201212312746.",
    LOYALTY_MODE_INVALID: "اختر نظام ولاء مدعومًا.",
    LOYALTY_UNIT_INVALID: "أدخل اسم وحدة ولاء من 1 إلى 30 حرفًا.",
    REWARD_NAME_INVALID: "أدخل اسم مكافأة مكوّنًا من حرفين على الأقل.",
    REWARD_THRESHOLD_INVALID: "أدخل هدف المكافأة كرقم صحيح لا يقل عن 1.",
    EARN_AMOUNT_INVALID: "أدخل قيمة الكسب كرقم صحيح لا يقل عن 1.",
  },
};

function issue(
  locale: SupportedLocale,
  code: OwnerOnboardingValidationCode,
  field: OwnerOnboardingValidationField,
  step: 0 | 1 | 2,
): OwnerOnboardingFieldError {
  return { code, field, step, message: messages[locale][code] };
}

export function getOwnerOnboardingValidationMessage(
  code: OwnerOnboardingValidationCode,
  locale: SupportedLocale,
) {
  return messages[locale][code];
}

export function normalizeOwnerOnboardingPhone(value: string, countryName: string) {
  const normalized = value.trim().replace(/[\s().-]/g, "");
  if (!normalized || normalized.startsWith("+")) return normalized;
  const country = COUNTRY_OPTIONS.find((option) => option.name === countryName);
  if (!country?.dialCode) return normalized;
  return `${country.dialCode}${normalized.replace(/^0+/, "")}`;
}

export function validateOwnerOnboardingStep(
  step: number,
  formData: FormData,
  locale: SupportedLocale = "en",
): OwnerOnboardingFieldError | null {
  const value = (field: string) => String(formData.get(field) ?? "").trim();

  if (step === 0) {
    const name = value("name");
    const country = value("country");
    const currency = value("currency").toUpperCase();
    const timezone = value("timezone");
    const phone = normalizeOwnerOnboardingPhone(value("contactPhone"), country);

    if (name.length < 2) return issue(locale, "BUSINESS_NAME_INVALID", "name", 0);

    const profileError = validateCountryProfile({ country, currency, timezone });
    if (profileError?.field === "country")
      return issue(locale, "COUNTRY_INVALID", "countrySelector", 0);
    if (profileError?.field === "currency")
      return issue(locale, "CURRENCY_INVALID", "currencyInput", 0);
    if (profileError?.field === "timezone")
      return issue(locale, "TIMEZONE_INVALID", "timezoneInput", 0);
    if (phone && !isValidBusinessPhone(phone))
      return issue(locale, "PHONE_INVALID", "contactPhone", 0);

    return null;
  }

  if (step === 1) {
    if (!loyaltyProgramFields.loyaltyMode.safeParse(value("loyaltyMode")).success)
      return issue(locale, "LOYALTY_MODE_INVALID", "loyaltyMode", 1);
    if (!loyaltyProgramFields.unitName.safeParse(value("unitName")).success)
      return issue(locale, "LOYALTY_UNIT_INVALID", "unitName", 1);
    return null;
  }

  if (step === 2) {
    if (!loyaltyProgramFields.rewardName.safeParse(value("rewardName")).success)
      return issue(locale, "REWARD_NAME_INVALID", "rewardName", 2);
    if (!loyaltyProgramFields.rewardThreshold.safeParse(value("rewardThreshold")).success)
      return issue(locale, "REWARD_THRESHOLD_INVALID", "rewardThreshold", 2);
    if (!loyaltyProgramFields.earnAmount.safeParse(value("earnAmount")).success)
      return issue(locale, "EARN_AMOUNT_INVALID", "earnAmount", 2);
    return null;
  }

  return null;
}

export function validateOwnerOnboardingThroughStep(
  maxStep: number,
  formData: FormData,
  locale: SupportedLocale = "en",
) {
  const boundedStep = Math.max(0, Math.min(2, maxStep));
  for (let step = 0; step <= boundedStep; step += 1) {
    const error = validateOwnerOnboardingStep(step, formData, locale);
    if (error) return error;
  }
  return null;
}
