import countries from "world-countries";
import { rawTimeZones } from "@vvo/tzdb";

import type { CountryOption } from "./country-search";

function callingCode(country: (typeof countries)[number]) {
  const suffix = country.idd.suffixes?.[0] ?? "";
  // Antarctica and Heard/McDonald Islands have no assigned public calling code.
  return `${country.idd.root ?? ""}${suffix}` || "—";
}

function flagFromIso2(iso2: string) {
  return String.fromCodePoint(...iso2.split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

const timezonesByCountry = new Map<string, string[]>();
for (const timezone of rawTimeZones) {
  if (!timezone.countryCode) continue;
  const current = timezonesByCountry.get(timezone.countryCode) ?? [];
  current.push(timezone.name);
  timezonesByCountry.set(timezone.countryCode, current);
}

/**
 * Complete versioned ISO country catalog. `world-countries` supplies names,
 * ISO codes, flags, calling-code metadata and currencies; tzdb supplies the
 * canonical IANA zones. It intentionally excludes non-country pseudo-zones.
 */
export const COUNTRY_OPTIONS: readonly CountryOption[] = countries
  .filter((country) => country.status === "officially-assigned" && Boolean(country.cca2))
  .map((country) => ({
    iso2: country.cca2,
    name: country.name.common,
    flag: country.flag || flagFromIso2(country.cca2),
    dialCode: callingCode(country),
    currency: Object.keys(country.currencies ?? {})[0] ?? "",
    timezones: [...new Set(timezonesByCountry.get(country.cca2) ?? [])].sort(),
  }))
  .sort((first, second) => first.name.localeCompare(second.name));

export const SUPPORTED_CURRENCY_CODES = [...new Set(
  COUNTRY_OPTIONS.map((country) => country.currency).filter(Boolean),
)].sort();
