export const APP_LANGUAGES = [
  "AR",
  "EN",
] as const;

export type AppLanguage =
  (typeof APP_LANGUAGES)[number];

export type AppDirection = "rtl" | "ltr";

export type LanguageAttributes = {
  language: AppLanguage;
  lang: "ar" | "en";
  dir: AppDirection;
};

export function isAppLanguage(
  value: unknown
): value is AppLanguage {
  return (
    value === "AR" ||
    value === "EN"
  );
}

export function normalizeLanguage(
  value: unknown
): AppLanguage {
  return isAppLanguage(value)
    ? value
    : "AR";
}

export function getLanguageDirection(
  language: AppLanguage
): AppDirection {
  return language === "AR"
    ? "rtl"
    : "ltr";
}

/**
 * The HTML language code for an application language. Keep this separate from
 * display locales (for example, ar-EG) which are used for date formatting.
 */
export function getLanguageCode(
  language: AppLanguage
): "ar" | "en" {
  return language === "AR" ? "ar" : "en";
}

export function getLanguageAttributes(
  value: unknown
): LanguageAttributes {
  const language = normalizeLanguage(value);

  return {
    language,
    lang: getLanguageCode(language),
    dir: getLanguageDirection(language),
  };
}

export function getLanguageLocale(
  language: AppLanguage
) {
  return language === "AR"
    ? "ar-EG"
    : "en-US";
}

export const sharedDictionary = {
  AR: {
    arabic: "العربية",
    english: "English",
    language: "اللغة",
    switchToArabic:
      "تغيير اللغة إلى العربية",
    switchToEnglish:
      "Change language to English",
  },

  EN: {
    arabic: "العربية",
    english: "English",
    language: "Language",
    switchToArabic:
      "تغيير اللغة إلى العربية",
    switchToEnglish:
      "Change language to English",
  },
} satisfies Record<
  AppLanguage,
  Record<string, string>
>;

export function getSharedDictionary(
  language: AppLanguage
) {
  return sharedDictionary[language];
}
