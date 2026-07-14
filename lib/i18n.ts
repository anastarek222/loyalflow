export const APP_LANGUAGES = [
  "AR",
  "EN",
] as const;

export type AppLanguage =
  (typeof APP_LANGUAGES)[number];

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
) {
  return language === "AR"
    ? "rtl"
    : "ltr";
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
