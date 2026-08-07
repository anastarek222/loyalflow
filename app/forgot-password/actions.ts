"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  issuePasswordResetToken,
} from "@/lib/auth/password-reset";
import {
  sendPasswordResetEmail,
} from "@/lib/auth/password-reset-email";
import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";
import {
  getClientAddress,
  rateLimit,
} from "@/lib/utils/rate-limiter";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function forgotPasswordAction(
  formData: FormData,
) {
  const requestHeaders = await headers();

  const limit = rateLimit(
    `password-reset-request:${getClientAddress(requestHeaders)}`,
    {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    },
  );

  if (!limit.allowed) {
    redirect("/forgot-password?sent=1");
  }

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirect("/forgot-password?sent=1");
  }

  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
      isActive: true,
      business: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (
    user?.isActive &&
    (!user.business || user.business.isActive)
  ) {
    try {
      const reset = await issuePasswordResetToken({
        userId: user.id,
      });

      await sendPasswordResetEmail({
        email: user.email,
        token: reset.token,
      });
    } catch (error) {
      logServerError(
        "password_reset_request_delivery_failed",
        error,
      );
    }
  }

  redirect("/forgot-password?sent=1");
}
