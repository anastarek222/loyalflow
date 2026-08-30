import { resolveTaneeAuthEmailSender } from "@/lib/auth/auth-email-sender";
import { getCanonicalPublicAppUrl } from "@/lib/public-app-url";

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
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveTaneeAuthEmailSender();

  if (!apiKey) {
    throw new PasswordResetEmailError("NOT_CONFIGURED");
  }

  const resetLink =
    `${getConfiguredAppUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Reset your Tanee password",
      text:
        `A password reset was requested for your Tanee account.\n\n` +
        `Reset your password: ${resetLink}\n\n` +
        `This link expires in 30 minutes. If you did not request this, you can ignore this email.`,
      html:
        `<p>A password reset was requested for your Tanee account.</p>` +
        `<p><a href="${resetLink}">Reset your password</a></p>` +
        `<p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`,
    }),
  });

  if (!response.ok) {
    throw new PasswordResetEmailError("DELIVERY_FAILED");
  }
}
