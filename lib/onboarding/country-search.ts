export type CountryOption = {
  iso2: string;
  name: string;
  flag: string;
  dialCode: string;
  currency?: string;
  timezones?: readonly string[];
};

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function countrySearchText(country: CountryOption) {
  return normalizeSearchValue(
    [country.name, country.iso2, country.dialCode].join(" ")
  );
}

export function searchCountryOptions(
  countries: readonly CountryOption[],
  query: string,
  limit = 40
) {
  const normalizedQuery = normalizeSearchValue(query);
  const normalizedLimit = Number.isSafeInteger(limit) && limit > 0 ? limit : 40;

  if (!normalizedQuery) {
    return countries.slice(0, normalizedLimit);
  }

  return countries
    .filter((country) => countrySearchText(country).includes(normalizedQuery))
    .slice(0, normalizedLimit);
}

export function findCountryByIso2(
  countries: readonly CountryOption[],
  iso2: string | null | undefined
) {
  const normalizedIso2 = iso2?.trim().toUpperCase();
  if (!normalizedIso2) return null;

  return countries.find((country) => country.iso2 === normalizedIso2) ?? null;
}

export function findCountryByCanonicalText(
  countries: readonly CountryOption[],
  value: string,
) {
  const normalizedValue = normalizeSearchValue(value);
  if (!normalizedValue) return null;

  return (
    countries.find(
      (country) =>
        normalizeSearchValue(country.name) === normalizedValue ||
        normalizeSearchValue(country.iso2) === normalizedValue,
    ) ?? null
  );
}

export function getCountryDefaults(country: CountryOption | null | undefined) {
  if (!country) {
    return {
      dialCode: "",
      currency: "",
      timezone: "",
      timezoneRequiresChoice: false,
    };
  }

  const timezones = country.timezones ?? [];

  return {
    dialCode: country.dialCode,
    currency: country.currency ?? "",
    timezone: timezones.length === 1 ? timezones[0] : "",
    timezoneRequiresChoice: timezones.length > 1,
  };
}
