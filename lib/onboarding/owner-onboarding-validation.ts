import {
  isValidBusinessPhone,
} from "@/lib/business-profile";
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";
import { validateCountryProfile } from "@/lib/business/domain-validation";

export type OwnerOnboardingFieldError = {
  field: string;
  message: string;
};

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
): OwnerOnboardingFieldError | null {
  if (step !== 0) return null;

  const value = (field: string) => String(formData.get(field) ?? "").trim();
  const name = value("name");
  const country = value("country");
  const currency = value("currency").toUpperCase();
  const timezone = value("timezone");
  const phone = normalizeOwnerOnboardingPhone(value("contactPhone"), country);

  if (name.length < 2)
    return {
      field: "name",
      message: "Enter a business name with at least 2 characters.",
    };
  const profileError = validateCountryProfile({
    country,
    currency,
    timezone,
  });
  if (profileError?.field === "country") {
    return {
      field: "countrySelector",
      message: "Choose a country from the list.",
    };
  }
  if (profileError?.field === "currency")
    return {
      field: "currencyInput",
      message: "Enter a supported 3-letter currency code.",
    };
  if (profileError?.field === "timezone")
    return {
      field: "timezoneInput",
      message: "Enter a valid timezone for the selected country.",
    };
  if (phone && !isValidBusinessPhone(phone)) {
    return {
      field: "contactPhone",
      message:
        "Enter the phone in international format, for example +201212312746.",
    };
  }

  return null;
}
