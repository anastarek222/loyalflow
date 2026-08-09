import {
  type PasswordChangeError,
} from "@/lib/auth/password-change-copy";
import type { PasswordChangeResult } from "@/lib/auth/password-change-core";
import { passwordConfirmationSchema } from "@/lib/auth/password-policy";
import type { AppLanguage } from "@/lib/i18n";
import { z } from "zod";

const currentPasswordSchema = z.string().min(1).max(128);

type SessionUser = {
  id: string;
  businessId: string | null;
  email?: string | null;
};

type SubmissionResult =
  | { status: "unauthenticated" }
  | { status: "error"; error: PasswordChangeError }
  | { status: "changed"; language: AppLanguage };

type SubmissionDependencies = {
  rateLimit(key: string): Promise<{ allowed: boolean }> | { allowed: boolean };
  changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    actor: SessionUser;
  }): Promise<PasswordChangeResult>;
};

export async function processPasswordChangeSubmission(
  input: {
    sessionUser: SessionUser | null;
    clientAddress: string;
    formData: FormData;
  },
  dependencies: SubmissionDependencies,
): Promise<SubmissionResult> {
  if (!input.sessionUser?.id) {
    return { status: "unauthenticated" };
  }

  const limit = await dependencies.rateLimit(
    `password-change:${input.sessionUser.id}:${input.clientAddress}`,
  );

  if (!limit.allowed) {
    return {
      status: "error",
      error: "throttled",
    };
  }

  const currentPassword = currentPasswordSchema.safeParse(
    input.formData.get("currentPassword"),
  );
  const newPassword = passwordConfirmationSchema.safeParse({
    password: input.formData.get("newPassword"),
    confirmPassword: input.formData.get("confirmNewPassword"),
  });

  if (!currentPassword.success || !newPassword.success) {
    return {
      status: "error",
      error: "invalid",
    };
  }

  const result = await dependencies.changePassword({
    userId: input.sessionUser.id,
    currentPassword: currentPassword.data,
    newPassword: newPassword.data.password,
    actor: input.sessionUser,
  });

  if (!result.changed) {
    return {
      status: "error",
      error:
        result.reason === "CREDENTIAL_CHANGED"
          ? "failed"
          : "incorrect-current-password",
    };
  }

  return {
    status: "changed",
    language: result.language,
  };
}
