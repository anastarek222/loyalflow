import { TANEE_AUTH_EMAIL_BRAND } from "@/lib/auth/auth-email-sender";
import {
  AuthEmailDeliveryError,
  createAuthEmailIdempotencyKey,
  sendResendAuthEmail,
} from "@/lib/auth/resend-email-delivery";
import { getCanonicalPublicAppUrl } from "@/lib/public-app-url";

export class OwnerInvitationEmailError extends Error {
  constructor(public readonly reason: "NOT_CONFIGURED" | "DELIVERY_FAILED") {
    super(reason);
    this.name = "OwnerInvitationEmailError";
  }
}

export async function sendOwnerInvitationEmail(input: {
  email: string;
  token: string;
}) {
  const invitationLink =
    `${getCanonicalPublicAppUrl()}/accept-owner-invitation?token=${encodeURIComponent(input.token)}`;

  try {
    await sendResendAuthEmail({
      to: input.email,
      subject: `Complete your ${TANEE_AUTH_EMAIL_BRAND} business setup`,
      text:
        `Continue setting up your business with ${TANEE_AUTH_EMAIL_BRAND}.\n\n` +
        `Set your password and continue: ${invitationLink}\n\n` +
        `This secure link expires in 24 hours. Your seven-day trial starts when you complete this secure step.`,
      html:
        `<p>Continue setting up your business with ${TANEE_AUTH_EMAIL_BRAND}.</p>` +
        `<p><a href="${invitationLink}">Set your password and continue</a></p>` +
        `<p>This secure link expires in 24 hours. Your seven-day trial starts when you complete this secure step.</p>`,
      idempotencyKey: createAuthEmailIdempotencyKey({
        purpose: "owner-invitation",
        email: input.email,
        token: input.token,
      }),
    });
  } catch (error) {
    if (error instanceof AuthEmailDeliveryError) {
      throw new OwnerInvitationEmailError(error.reason);
    }

    throw error;
  }
}
