import { DEFAULT_LOCALE, type SupportedLocale } from "./config";

export const messages = {
  en: {
    "common.brand": "LoyalFlow",
    "common.continue": "Continue",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.language": "Language",
    "common.english": "English",
    "common.arabic": "العربية",
    "auth.signIn": "Sign in",
    "auth.signInWorkspace": "Sign in to your workspace",
    "auth.email": "Email address",
    "auth.password": "Password",
    "auth.forgotPassword": "Forgot password?",
    "auth.secureWorkspace": "Secure LoyalFlow workspace",
  },
  ar: {
    "common.brand": "LoyalFlow",
    "common.continue": "متابعة",
    "common.cancel": "إلغاء",
    "common.save": "حفظ",
    "common.language": "اللغة",
    "common.english": "English",
    "common.arabic": "العربية",
    "auth.signIn": "تسجيل الدخول",
    "auth.signInWorkspace": "سجّل الدخول إلى مساحة العمل الخاصة بك",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.forgotPassword": "هل نسيت كلمة المرور؟",
    "auth.secureWorkspace": "مساحة عمل LoyalFlow آمنة",
  },
} as const;

export type MessageKey = keyof (typeof messages)[typeof DEFAULT_LOCALE];

type LocaleCatalog = Record<MessageKey, string>;

const catalogs: Record<SupportedLocale, LocaleCatalog> = messages;

export function translate(locale: SupportedLocale, key: MessageKey): string {
  return catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key];
}
