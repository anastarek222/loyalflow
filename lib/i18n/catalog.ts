import { DEFAULT_LOCALE, type SupportedLocale } from "./config";

export const messages = {
  en: {
    "common.brand": "LoyalFlow",
    "common.continue": "Continue",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "auth.signIn": "Sign in",
    "auth.email": "Email",
    "auth.password": "Password",
  },
  ar: {
    "common.brand": "LoyalFlow",
    "common.continue": "متابعة",
    "common.cancel": "إلغاء",
    "common.save": "حفظ",
    "auth.signIn": "تسجيل الدخول",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
  },
} as const;

export type MessageKey = keyof (typeof messages)[typeof DEFAULT_LOCALE];

type LocaleCatalog = Record<MessageKey, string>;

const catalogs: Record<SupportedLocale, LocaleCatalog> = messages;

export function translate(locale: SupportedLocale, key: MessageKey): string {
  return catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key];
}
