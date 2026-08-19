import { marketingMessagesAr } from "./locales/ar/marketing";
import { marketingMessagesEn } from "./locales/en/marketing";

const arParity: Record<keyof typeof marketingMessagesEn, string> =
  marketingMessagesAr;
const enParity: Record<keyof typeof marketingMessagesAr, string> =
  marketingMessagesEn;

export const marketingMessages = {
  en: enParity,
  ar: arParity,
} as const;
