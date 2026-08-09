import { getCanonicalPublicAppUrl } from "@/lib/public-app-url";

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
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.PASSWORD_RESET_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    throw new EmailVerificationEmailError("NOT_CONFIGURED");
  }

  const verifyLink =
    `${getCanonicalPublicAppUrl()}/verify-email?token=${encodeURIComponent(input.token)}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Verify your LoyalFlow email",
      text:
        `Verify your LoyalFlow email address:\n\n${verifyLink}\n\n` +
        `This link expires in 24 hours.`,
      html:
        `<p>Verify your LoyalFlow email address.</p>` +
        `<p><a href="${verifyLink}">Verify email</a></p>` +
        `<p>This link expires in 24 hours.</p>`,
    }),
  });

  if (!response.ok) {
    throw new EmailVerificationEmailError("DELIVERY_FAILED");
  }
}
