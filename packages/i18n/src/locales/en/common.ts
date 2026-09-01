export const englishCommonMessages = {
  "common.brand": "Tanee",
  "common.continue": "Continue",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.language": "Language",
  "common.english": "English",
  "common.arabic": "العربية",
  "common.switchToArabic": "تغيير اللغة إلى العربية",
  "common.switchToEnglish": "Change language to English",
} as const;

export type CommonMessageKey = keyof typeof englishCommonMessages;
