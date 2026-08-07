"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  consumePasswordResetToken,
  PasswordResetError,
} from "@/lib/auth/password-reset";

const resetPasswordFormSchema = z.object({
  token: z.string().trim().min(20).max(256),
  newPassword: z.string().min(10).max(128),
  confirmPassword: z.string().min(10).max(128),
});

function resetErrorPath(
  token: string,
  error: string,
) {
  const query = new URLSearchParams({
    token,
    error,
  });

  return `/reset-password?${query.toString()}`;
}

export async function resetPasswordAction(
  formData: FormData,
) {
  const parsed = resetPasswordFormSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect("/reset-password?error=invalid-token");
  }

  if (
    parsed.data.newPassword !==
    parsed.data.confirmPassword
  ) {
    redirect(
      resetErrorPath(
        parsed.data.token,
        "password-mismatch",
      ),
    );
  }

  try {
    await consumePasswordResetToken({
      token: parsed.data.token,
      newPassword: parsed.data.newPassword,
    });
  } catch (error) {
    if (error instanceof PasswordResetError) {
      if (error.reason === "INVALID_PASSWORD") {
        redirect(
          resetErrorPath(
            parsed.data.token,
            "password-invalid",
          ),
        );
      }

      redirect("/reset-password?error=invalid-token");
    }

    throw error;
  }

  redirect("/login?reset=success");
}
