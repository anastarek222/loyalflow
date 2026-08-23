export const englishPasswordPolicyMessages = {
  "passwordPolicy.mismatch": "Passwords do not match.",
} as const;

export type PasswordPolicyMessageKey =
  keyof typeof englishPasswordPolicyMessages;
