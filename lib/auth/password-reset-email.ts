import {
  AuthEmailDeliveryError,
  createAuthEmailIdempotencyKey,
  sendResendAuthEmail,
} from "@/lib/auth/resend-email-delivery";
import { getCanonicalPublicAppUrl } from "@/lib/public-app-url";
import { platformBrand } from "@/lib/platform-brand";

export class PasswordResetEmailError extends Error {
  constructor(
    public readonly reason:
      | "NOT_CONFIGURED"
      | "DELIVERY_FAILED",
  ) {
    super(reason);
    this.name = "PasswordResetEmailError";
  }
}

export function getConfiguredAppUrl() {
  return getCanonicalPublicAppUrl();
}

export async function sendPasswordResetEmail(input: {
  email: string;
  token: string;
}) {
  const resetLink =
    `${getConfiguredAppUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;

  try {
    await sendResendAuthEmail({
      to: input.email,
      subject: `Reset your ${platformBrand.name} password`,
      text:
        `A password reset was requested for your ${platformBrand.name} account.\n\n` +
        `Reset your password: ${resetLink}\n\n` +
        `This link expires in 30 minutes. If you did not request this, you can ignore this email.`,
      html:
        `<p>A password reset was requested for your ${platformBrand.name} account.</p>` +
        `<p><a href="${resetLink}">Reset your password</a></p>` +
        `<p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`,
      idempotencyKey: createAuthEmailIdempotencyKey({
        purpose: "password-reset",
        email: input.email,
        token: input.token,
      }),
    });
  } catch (error) {
    if (error instanceof AuthEmailDeliveryError) {
      throw new PasswordResetEmailError(error.reason);
    }

    throw error;
  }
}
