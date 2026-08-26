import {
  AuthEmailDeliveryError,
  createAuthEmailIdempotencyKey,
  sendResendAuthEmail,
} from "@/lib/auth/resend-email-delivery";
import { getCanonicalPublicAppUrl } from "@/lib/public-app-url";
import { platformBrand } from "@/lib/platform-brand";

export class EmailVerificationEmailError extends Error {
  constructor(public readonly reason: "NOT_CONFIGURED" | "DELIVERY_FAILED") {
    super(reason);
    this.name = "EmailVerificationEmailError";
  }
}

export async function sendEmailVerificationEmail(input: {
  email: string;
  token: string;
}) {
  const verifyLink =
    `${getCanonicalPublicAppUrl()}/verify-email?token=${encodeURIComponent(input.token)}`;

  try {
    await sendResendAuthEmail({
      to: input.email,
      subject: `Verify your ${platformBrand.name} email`,
      text:
        `Verify your ${platformBrand.name} email address:\n\n${verifyLink}\n\n` +
        `This link expires in 24 hours.`,
      html:
        `<p>Verify your ${platformBrand.name} email address.</p>` +
        `<p><a href="${verifyLink}">Verify email</a></p>` +
        `<p>This link expires in 24 hours.</p>`,
      idempotencyKey: createAuthEmailIdempotencyKey({
        purpose: "email-verification",
        email: input.email,
        token: input.token,
      }),
    });
  } catch (error) {
    if (error instanceof AuthEmailDeliveryError) {
      throw new EmailVerificationEmailError(error.reason);
    }

    throw error;
  }
}
