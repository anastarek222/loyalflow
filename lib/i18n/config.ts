export const SUPPORTED_LOCALES = ["en", "ar"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export type TextDirection = "ltr" | "rtl";

const LOCALE_DIRECTIONS: Record<SupportedLocale, TextDirection> = {
  en: "ltr",
  ar: "rtl",
};

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function normalizeLocale(value: string | null | undefined): SupportedLocale {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  const language = value.trim().toLowerCase().split(/[-_]/, 1)[0];
  return isSupportedLocale(language) ? language : DEFAULT_LOCALE;
}

export function getLocaleDirection(locale: SupportedLocale): TextDirection {
  return LOCALE_DIRECTIONS[locale];
}
