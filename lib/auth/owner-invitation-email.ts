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
      subject: "You’re invited to LoyalFlow",
      text:
        `You have been invited to create your LoyalFlow owner account.\n\n` +
        `Accept invitation: ${invitationLink}\n\n` +
        `This link expires in 24 hours.`,
      html:
        `<p>You have been invited to create your LoyalFlow owner account.</p>` +
        `<p><a href="${invitationLink}">Accept invitation</a></p>` +
        `<p>This link expires in 24 hours.</p>`,
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
