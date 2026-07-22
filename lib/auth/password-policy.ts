import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 100;

export const passwordValueSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH)
  .max(MAX_PASSWORD_LENGTH);

export const passwordConfirmationSchema = z
  .object({
    password: passwordValueSchema,
    confirmPassword: passwordValueSchema,
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      path: ["confirmPassword"],
      message: "كلمتا المرور غير متطابقتين",
    }
  );
