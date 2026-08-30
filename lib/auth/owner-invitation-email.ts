import { resolveTaneeAuthEmailSender } from "@/lib/auth/auth-email-sender";
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
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveTaneeAuthEmailSender();

  if (!apiKey) {
    throw new OwnerInvitationEmailError("NOT_CONFIGURED");
  }

  const invitationLink =
    `${getCanonicalPublicAppUrl()}/accept-owner-invitation?token=${encodeURIComponent(input.token)}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "You’re invited to Tanee",
      text:
        `You have been invited to create your Tanee owner account.\n\n` +
        `Accept invitation: ${invitationLink}\n\n` +
        `This link expires in 24 hours.`,
      html:
        `<p>You have been invited to create your Tanee owner account.</p>` +
        `<p><a href="${invitationLink}">Accept invitation</a></p>` +
        `<p>This link expires in 24 hours.</p>`,
    }),
  });

  if (!response.ok) {
    throw new OwnerInvitationEmailError("DELIVERY_FAILED");
  }
}
