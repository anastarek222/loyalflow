import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";

function countryDialCode(countryName?: string | null) {
  if (!countryName) return null;
  return COUNTRY_OPTIONS.find((country) => country.name === countryName)?.dialCode ?? null;
}

/** Canonical persisted customer identity: E.164-like digits with one leading +. */
export function normalizePhone(value: string, countryName?: string | null) {
  const cleaned = value.trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return `+${cleaned.slice(1).replace(/\D/g, "")}`;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2).replace(/^0+/, "")}`;

  const dialCode = countryDialCode(countryName);
  if (dialCode && dialCode !== "—") {
    const digits = cleaned.replace(/^0+/, "");
    const dialDigits = dialCode.replace(/^\+/, "");
    return `+${digits.startsWith(dialDigits) ? digits : `${dialDigits}${digits}`}`;
  }

  return cleaned;
}

export function equivalentPhoneIdentities(value: string, countryName?: string | null) {
  const canonical = normalizePhone(value, countryName);
  if (!/^\+\d{8,15}$/.test(canonical)) return [canonical];

  const digits = canonical.slice(1);
  const variants = new Set([canonical, digits, `00${digits}`]);
  const dialCode = countryDialCode(countryName);
  const dialDigits = dialCode?.replace(/^\+/, "");
  if (dialDigits && digits.startsWith(dialDigits)) {
    variants.add(`0${digits.slice(dialDigits.length)}`);
  }
  return [...variants];
}
