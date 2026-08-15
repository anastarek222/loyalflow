import { arabicAuthMessages } from "./locales/ar/auth";
import { englishAuthMessages } from "./locales/en/auth";

export const authMessages = {
  en: englishAuthMessages,
  ar: arabicAuthMessages,
} as const;

export type AuthMessageKey = keyof typeof authMessages.en;
