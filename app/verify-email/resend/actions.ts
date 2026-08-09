"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { sendEmailVerificationEmail } from "@/lib/auth/email-verification-email";
import { issueEmailVerificationToken } from "@/lib/auth/email-verification-runtime";
import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";
import {
  distributedRateLimit,
  getClientAddress,
} from "@/lib/utils/rate-limiter";

const resendSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function resendEmailVerificationAction(formData: FormData) {
  const requestHeaders = await headers();
  const limit = await distributedRateLimit(
    `email-verification-resend:${getClientAddress(requestHeaders)}`,
    { limit: 5, windowMs: 15 * 60 * 1000 },
  );

  if (!limit.allowed) redirect("/verify-email/resend?sent=1");

  const parsed = resendSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/verify-email/resend?sent=1");

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

  try {
    const token = await issueEmailVerificationToken({ userId: user.id });
    await sendEmailVerificationEmail({ email, token: token.token });
  } catch (error) {
    logServerError("email_verification_resend_failed", error, {
      userId: user.id,
    });
  }

  redirect("/verify-email/resend?sent=1");
}
