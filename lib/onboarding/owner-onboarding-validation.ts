import {
  isValidBusinessPhone,
} from "@/lib/business-profile";
import type { SupportedLocale } from "@/lib/i18n/config";
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";
import { validateCountryProfile } from "@/lib/business/domain-validation";

export type OwnerOnboardingFieldError = {
  field: string;
  message: string;
};

const errors = {
  en: {
    name: "Enter a business name with at least 2 characters.",
    country: "Choose a country from the list.",
    currency: "Enter a supported 3-letter currency code.",
    timezone: "Enter a valid timezone for the selected country.",
    phone: "Enter the phone in international format, for example +201212312746.",
  },
  ar: {
    name: "أدخل اسم نشاط مكوّنًا من حرفين على الأقل.",
    country: "اختر دولة من القائمة.",
    currency: "أدخل رمز عملة مدعومًا من 3 أحرف.",
    timezone: "أدخل منطقة زمنية صحيحة للدولة المختارة.",
    phone: "أدخل رقم الهاتف بصيغة دولية، مثل +201212312746.",
  },
} as const;

export function normalizeOwnerOnboardingPhone(
  value: string,
  countryName: string,
) {
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
  if (step !== 0) return null;

  const t = errors[locale];
  const value = (field: string) => String(formData.get(field) ?? "").trim();
  const name = value("name");
  const country = value("country");
  const currency = value("currency").toUpperCase();
  const timezone = value("timezone");
  const phone = normalizeOwnerOnboardingPhone(value("contactPhone"), country);

  if (name.length < 2)
    return {
      field: "name",
      message: t.name,
    };
  const profileError = validateCountryProfile({
    country,
    currency,
    timezone,
  });
  if (profileError?.field === "country") {
    return {
      field: "countrySelector",
      message: t.country,
    };
  }
  if (profileError?.field === "currency")
    return {
      field: "currencyInput",
      message: t.currency,
    };
  if (profileError?.field === "timezone")
    return {
      field: "timezoneInput",
      message: t.timezone,
    };
  if (phone && !isValidBusinessPhone(phone)) {
    return {
      field: "contactPhone",
      message: t.phone,
    };
  }

  return null;
}
