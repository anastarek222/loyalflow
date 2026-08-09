"use server";

import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isEmailVerificationSatisfied } from "@/lib/auth/email-verification-access";
import {
  beginSuperAdminMfaEnrollment,
  enableSuperAdminMfa,
} from "@/lib/auth/super-admin-mfa-runtime";
import prisma from "@/lib/prisma";
import {
  distributedRateLimit,
  getClientAddress,
} from "@/lib/utils/rate-limiter";

export type BeginMfaState = {
  error?: "invalid" | "unavailable";
  enrollmentToken?: string;
  otpauthUri?: string;
  secret?: string;
  recoveryCodes?: string[];
};

export type ConfirmMfaState = {
  error?: "invalid" | "expired";
};

const beginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(10).max(200),
});

const confirmSchema = z.object({
  enrollmentToken: z.string().min(20).max(256),
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function beginMfaEnrollmentAction(
  _previousState: BeginMfaState,
  formData: FormData,
): Promise<BeginMfaState> {
  const parsed = beginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid" };

  const requestHeaders = await headers();
  const clientAddress = getClientAddress(requestHeaders);
  const attempt = await distributedRateLimit(
    `super-admin-mfa-enroll:${clientAddress}`,
    {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    },
  );
  if (!attempt.allowed) return { error: "unavailable" };

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });

  if (
    !user ||
    !user.isActive ||
    user.role !== "SUPER_ADMIN" ||
    !(await compare(parsed.data.password, user.passwordHash)) ||
    !(await isEmailVerificationSatisfied(user.id))
  ) {
    return { error: "invalid" };
  }

  try {
    const enrollment = await beginSuperAdminMfaEnrollment({
      userId: user.id,
      email: user.email,
    });

    return {
      enrollmentToken: enrollment.enrollmentToken,
      otpauthUri: enrollment.otpauthUri,
      secret: enrollment.secret,
      recoveryCodes: enrollment.recoveryCodes,
    };
  } catch {
    return { error: "unavailable" };
  }
}

export async function confirmMfaEnrollmentAction(
  _previousState: ConfirmMfaState,
  formData: FormData,
): Promise<ConfirmMfaState> {
  const parsed = confirmSchema.safeParse({
    enrollmentToken: formData.get("enrollmentToken"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: "invalid" };

  const requestHeaders = await headers();
  const attempt = await distributedRateLimit(
    `super-admin-mfa-enroll-confirm:${getClientAddress(requestHeaders)}`,
    { limit: 8, windowMs: 15 * 60 * 1000 },
  );
  if (!attempt.allowed) return { error: "invalid" };

  const enabled = await enableSuperAdminMfa(parsed.data);
  if (!enabled) return { error: "expired" };

  redirect("/login/super-admin?mfa=enabled");
}
