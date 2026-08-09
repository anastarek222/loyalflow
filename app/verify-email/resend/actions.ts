"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { createEmailVerificationToken } from "@/lib/auth/email-verification";
import {
  EmailVerificationEmailError,
  sendEmailVerificationEmail,
} from "@/lib/auth/email-verification-email";
import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";
import { getClientAddress, rateLimit } from "@/lib/utils/rate-limiter";

const resendSchema = z.object({
  email: z.string().trim().email(),
});

export async function resendEmailVerificationAction(formData: FormData) {
  const parsed = resendSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/verify-email/resend?sent=1");

  const headers = new Headers();
  const limit = rateLimit(`email-verification-resend:${getClientAddress(headers)}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) redirect("/verify-email/resend?sent=1");

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });

  if (!user?.isActive) redirect("/verify-email/resend?sent=1");

  const states = await prisma.$queryRaw<Array<{ verifiedAt: Date | null }>>`
    SELECT "verifiedAt"
    FROM "EmailVerificationState"
    WHERE "userId" = ${user.id}
    LIMIT 1
  `;

  if (!states[0] || states[0].verifiedAt) {
    redirect("/verify-email/resend?sent=1");
  }

  const token = createEmailVerificationToken();

  await prisma.$executeRaw`
    INSERT INTO "EmailVerificationToken" (
      "id", "userId", "tokenHash", "expiresAt", "usedAt", "createdAt"
    ) VALUES (
      ${token.id}, ${user.id}, ${token.tokenHash}, ${token.expiresAt}, NULL, CURRENT_TIMESTAMP
    )
  `;

  try {
    await sendEmailVerificationEmail({ email, token: token.token });
  } catch (error) {
    if (error instanceof EmailVerificationEmailError) {
      logServerError("EMAIL_VERIFICATION_RESEND_DELIVERY_FAILED", error, {
        userId: user.id,
      });
      redirect("/verify-email/resend?sent=1");
    }
    throw error;
  }

  redirect("/verify-email/resend?sent=1");
}
