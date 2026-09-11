import countries from "world-countries";

type CountryRecord = (typeof countries)[number];

const MIN_E164_DIGITS = 8;
const MAX_E164_DIGITS = 15;

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function normalizeNumerals(value: string) {
  return Array.from(value, (character) => {
    const arabicIndicIndex = ARABIC_INDIC_DIGITS.indexOf(character);
    if (arabicIndicIndex >= 0) return String(arabicIndicIndex);

    const easternArabicIndex = EASTERN_ARABIC_DIGITS.indexOf(character);
    if (easternArabicIndex >= 0) return String(easternArabicIndex);

    return character;
  }).join("");
}

function normalizeCountryKey(value: string) {
  return value.trim().toLocaleLowerCase("en");
}

function countryMatches(country: CountryRecord, value: string) {
  const key = normalizeCountryKey(value);
  const aliases = [
    country.cca2,
    country.cca3,
    country.name.common,
    country.name.official,
    ...country.altSpellings,
  ];

  return aliases.some((alias) => normalizeCountryKey(alias) === key);
}

function resolveCountry(value?: string | null) {
  if (!value?.trim()) return null;
  return countries.find((country) => countryMatches(country, value)) ?? null;
}

function getCountryCallingCode(country: CountryRecord) {
  const root = country.idd.root?.replace(/\D/g, "") ?? "";
  const suffixes = country.idd.suffixes ?? [];
  if (!root) return null;

  // NANP countries share +1. US and Canada use +1 directly; territories have
  // one explicit suffix in world-countries and can therefore be resolved.
  if (root === "1" && (country.cca2 === "US" || country.cca2 === "CA")) {
    return root;
  }

  if (suffixes.length === 0) return root;
  if (suffixes.length === 1) return `${root}${suffixes[0]}`;

  // Multiple possible international prefixes are ambiguous. Require the user
  // to enter an explicit +E.164 number rather than guessing.
  return null;
}

function asE164(digits: string) {
  if (
    digits.length < MIN_E164_DIGITS ||
    digits.length > MAX_E164_DIGITS ||
    digits.startsWith("0")
  ) {
    return null;
  }

  return `+${digits}`;
}

export function phoneDigits(value: string) {
  return normalizeNumerals(value).replace(/\D/g, "");
}

export function normalizePhoneE164(
  value: string,
  defaultCountry?: string | null,
) {
  const normalized = normalizeNumerals(value).trim();
  if (!normalized) return null;

  if (normalized.startsWith("+")) {
    return asE164(normalized.slice(1).replace(/\D/g, ""));
  }

  if (normalized.startsWith("00")) {
    return asE164(normalized.slice(2).replace(/\D/g, ""));
  }

  const country = resolveCountry(defaultCountry);
  if (!country) return null;

  const callingCode = getCountryCallingCode(country);
  if (!callingCode) return null;

  const digits = phoneDigits(normalized);
  if (!digits) return null;

  // Accept a country-code-prefixed value without a plus, otherwise treat it
  // as a national number and remove one common trunk zero before prefixing.
  if (digits.startsWith(callingCode)) {
    return asE164(digits);
  }

  const nationalNumber = digits.startsWith("0") ? digits.slice(1) : digits;
  return asE164(`${callingCode}${nationalNumber}`);
}

/**
 * Compatibility sanitizer for non-WhatsApp call sites that still need the
 * historical cleaned representation. New customer writes should use
 * normalizePhoneE164 so the persisted value is canonical.
 */
export function normalizePhone(value: string) {
  const normalized = normalizeNumerals(value).replace(/[^\d+]/g, "");
  return normalized.replace(/(?!^)\+/g, "");
}
