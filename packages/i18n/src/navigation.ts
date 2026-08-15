import { arabicNavigationMessages } from "./locales/ar/navigation";
import { englishNavigationMessages } from "./locales/en/navigation";

export const navigationMessages = {
  en: englishNavigationMessages,
  ar: arabicNavigationMessages,
} as const;

export type NavigationMessageKey = keyof typeof navigationMessages.en;
