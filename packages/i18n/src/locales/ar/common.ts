import type { CommonMessageKey } from "../en/common";

export const arabicCommonMessages = {
  "common.brand": "LoyalFlow",
  "common.continue": "متابعة",
  "common.cancel": "إلغاء",
  "common.save": "حفظ",
  "common.language": "اللغة",
  "common.english": "English",
  "common.arabic": "العربية",
  "common.switchToArabic": "تغيير اللغة إلى العربية",
  "common.switchToEnglish": "Change language to English",
} as const satisfies Record<CommonMessageKey, string>;
