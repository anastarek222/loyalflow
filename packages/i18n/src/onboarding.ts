import { onboardingMessagesAr } from "./locales/ar/onboarding";
import { onboardingMessagesEn } from "./locales/en/onboarding";

export const onboardingMessages = {
  en: onboardingMessagesEn,
  ar: onboardingMessagesAr,
} as const;

export type OnboardingLocale = keyof typeof onboardingMessages;
export type OnboardingMessageKey = keyof typeof onboardingMessages.en;
