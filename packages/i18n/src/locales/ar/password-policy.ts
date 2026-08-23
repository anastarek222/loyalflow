import type { PasswordPolicyMessageKey } from "../en/password-policy";

export const arabicPasswordPolicyMessages = {
  "passwordPolicy.mismatch": "كلمتا المرور غير متطابقتين",
} as const satisfies Record<PasswordPolicyMessageKey, string>;
