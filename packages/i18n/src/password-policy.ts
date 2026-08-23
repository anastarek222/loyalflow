import { arabicPasswordPolicyMessages } from "./locales/ar/password-policy";
import { englishPasswordPolicyMessages } from "./locales/en/password-policy";

export const passwordPolicyMessages = {
  en: englishPasswordPolicyMessages,
  ar: arabicPasswordPolicyMessages,
} as const;

export type PasswordPolicyLocale = keyof typeof passwordPolicyMessages;
export type PasswordPolicyMessageKey =
  keyof typeof passwordPolicyMessages.en;
