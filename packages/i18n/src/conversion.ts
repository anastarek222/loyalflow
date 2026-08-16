import { conversionMessagesAr } from "./locales/ar/conversion";
import { conversionMessagesEn } from "./locales/en/conversion";

export const conversionMessages = {
  en: conversionMessagesEn,
  ar: conversionMessagesAr,
} as const;

export type ConversionLocale = keyof typeof conversionMessages;
export type ConversionMessageKey = keyof typeof conversionMessages.en;
