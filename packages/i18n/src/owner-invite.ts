import { arabicOwnerInviteMessages } from "./locales/ar/owner-invite";
import { englishOwnerInviteMessages } from "./locales/en/owner-invite";

export const ownerInviteMessages = {
  en: englishOwnerInviteMessages,
  ar: arabicOwnerInviteMessages,
} as const;

export type OwnerInviteLocale = keyof typeof ownerInviteMessages;
export type OwnerInviteMessageKey = keyof typeof ownerInviteMessages.en;
