import {
  findCountryByCanonicalText,
  findCountryByIso2,
  getCountryDefaults,
} from "@/lib/onboarding/country-search";
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";

const defaultCountry = findCountryByIso2(COUNTRY_OPTIONS, "EG");

if (!defaultCountry) {
  throw new Error("Owner onboarding default country is unavailable");
}

const defaultCountryProfile = getCountryDefaults(defaultCountry);

export const OWNER_ONBOARDING_DEFAULTS = {
  name: "",
  industry: "",
  country: defaultCountry.name,
  city: "",
  contactPhone: "",
  currency: defaultCountryProfile.currency,
  timezone: defaultCountryProfile.timezone,
  loyaltyMode: "VISITS" as const,
  unitName: "Visit",
  rewardName: "Reward",
  rewardThreshold: 5,
  earnAmount: 1,
  primaryColor: "#111827",
  secondaryColor: "#FFFFFF",
  themePreset: "DEFAULT" as const,
  logoUrl: "",
  standardCardArtworkEnabled: true,
  standardCardArtworkCategory: "OTHER" as const,
} as const;

export function resolveOwnerOnboardingCountryProfile(input: {
  country?: unknown;
  currency?: unknown;
  timezone?: unknown;
}) {
  const requestedCountry = String(input.country ?? "").trim();
  const country = requestedCountry
    ? findCountryByCanonicalText(COUNTRY_OPTIONS, requestedCountry)
    : defaultCountry;
  const defaults = getCountryDefaults(country);

  return {
    country: country?.name ?? requestedCountry,
    currency: String(input.currency ?? "").trim() || defaults.currency,
    timezone: String(input.timezone ?? "").trim() || defaults.timezone,
  };
}
