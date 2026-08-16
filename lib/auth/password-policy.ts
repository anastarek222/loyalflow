import {
  passwordPolicyMessages,
  type PasswordPolicyLocale,
} from "@loyalflow/i18n/password-policy";
import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 100;

export const passwordValueSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH)
  .max(MAX_PASSWORD_LENGTH);

export function createPasswordConfirmationSchema(
  locale: PasswordPolicyLocale,
) {
  return z
    .object({
      password: passwordValueSchema,
      confirmPassword: passwordValueSchema,
    })
    .refine(
      (data) => data.password === data.confirmPassword,
      {
        path: ["confirmPassword"],
        message: passwordPolicyMessages[locale]["passwordPolicy.mismatch"],
      },
    );
}

// Preserve the existing validation message for current callers while enabling
// locale-aware adoption by later bounded auth slices.
export const passwordConfirmationSchema =
  createPasswordConfirmationSchema("ar");
