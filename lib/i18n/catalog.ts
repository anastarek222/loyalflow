import { authMessages } from "@loyalflow/i18n/auth";
import { commonMessages } from "@loyalflow/i18n/common";
import { conversionMessages } from "@loyalflow/i18n/conversion";
import { onboardingMessages } from "@loyalflow/i18n/onboarding";
import { ownerInviteMessages } from "@loyalflow/i18n/owner-invite";
import { DEFAULT_LOCALE, type SupportedLocale } from "./config";
import { marketingMessages } from "./marketing";

export const messages = {
  en: {
    ...commonMessages.en,
    ...authMessages.en,
    ...ownerInviteMessages.en,
    ...onboardingMessages.en,
    ...conversionMessages.en,
    ...marketingMessages.en,
  },
  ar: {
    ...commonMessages.ar,
    ...authMessages.ar,
    ...ownerInviteMessages.ar,
    ...onboardingMessages.ar,
    ...conversionMessages.ar,
    ...marketingMessages.ar,
  },
} as const;

export type MessageKey = keyof (typeof messages)[typeof DEFAULT_LOCALE];

type LocaleCatalog = Record<MessageKey, string>;

const catalogs: Record<SupportedLocale, LocaleCatalog> = messages;

export function translate(locale: SupportedLocale, key: MessageKey): string {
  return catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key];
}
