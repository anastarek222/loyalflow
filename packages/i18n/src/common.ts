import { arabicCommonMessages } from "./locales/ar/common";
import { englishCommonMessages } from "./locales/en/common";

export const commonMessages = {
  en: englishCommonMessages,
  ar: arabicCommonMessages,
} as const;

export type CommonMessageKey = keyof typeof commonMessages.en;
