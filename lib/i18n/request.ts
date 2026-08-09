import { DEFAULT_LOCALE, normalizeLocale, type SupportedLocale } from "./config";

export const LOCALE_COOKIE_NAME = "loyalflow_locale";

export function resolveRequestLocale(cookieValue: string | null | undefined): SupportedLocale {
  if (!cookieValue) {
    return DEFAULT_LOCALE;
  }

  return normalizeLocale(cookieValue);
}
