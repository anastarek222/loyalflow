"use server";

import { signIn } from "@/auth";
import { isEmailVerificationSatisfied } from "@/lib/auth/email-verification-access";
import { isLoginDatabaseUnavailableError } from "@/lib/auth/login-dependency-error";
import { recordLoginDenial } from "@/lib/auth/login-observability";
import { isSuperAdminMfaEnabled } from "@/lib/auth/super-admin-mfa-runtime";
import prisma from "@/lib/prisma";
import {
  distributedRateLimit,
  getClientAddress,
} from "@/lib/utils/rate-limiter";
import { compare } from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

export type LoginState = {
  status?:
    | "invalid"
    | "verification-required"
    | "mfa-required"
    | "mfa-invalid"
    | "mfa-setup-required"
    | "service-unavailable";
};

const loginStepSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(10).max(200),
  mfaCode: z.string().trim().max(64).optional().default(""),
  loginStep: z.enum(["primary", "mfa"]).default("primary"),
});

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginStepSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    mfaCode: formData.get("mfaCode") ?? undefined,
    loginStep: formData.get("loginStep"),
  });
  if (!parsed.success) {
    recordLoginDenial("primary", "invalid_input");
    return { status: "invalid" };
  }

  if (parsed.data.loginStep === "primary") {
    const requestHeaders = await headers();
    const attempt = await distributedRateLimit(
      `credentials-primary-step:${getClientAddress(requestHeaders)}`,
      { limit: 10, windowMs: 15 * 60 * 1000 },
    );
    if (!attempt.allowed) {
      recordLoginDenial("primary", "rate_limited");
      return { status: "invalid" };
    }

    const email = parsed.data.email.toLowerCase();

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          role: true,
          isActive: true,
          passwordHash: true,
          business: { select: { isActive: true } },
        },
      });

      if (!user || !user.isActive || (user.business && !user.business.isActive)) {
        recordLoginDenial("primary", "account_unavailable");
        return { status: "invalid" };
      }

      if (!(await compare(parsed.data.password, user.passwordHash))) {
        recordLoginDenial("primary", "password_mismatch");
        return { status: "invalid" };
      }

      if (!(await isEmailVerificationSatisfied(user.id))) {
        recordLoginDenial("primary", "email_unverified");
        return { status: "verification-required" };
      }

      if (user.role === "SUPER_ADMIN") {
        const enabled = await isSuperAdminMfaEnabled(user.id);
        return {
          status: enabled ? "mfa-required" : "mfa-setup-required",
        };
      }
    } catch (error) {
      if (isLoginDatabaseUnavailableError(error)) {
        return { status: "service-unavailable" };
      }

      throw error;
    }
  }

  formData.set("redirectTo", "/dashboard");

  try {
    // Authentication changes the authority behind shared App Router layouts.
    // Purge cached shell segments before establishing the new session so the
    // destination is rendered with this user's role and tenant context.
    revalidatePath("/", "layout");
    await signIn("credentials", formData);
  } catch (error) {
    if (isLoginDatabaseUnavailableError(error)) {
      return { status: "service-unavailable" };
    }

    if (error instanceof AuthError) {
      recordLoginDenial("primary", "credentials_rejected");
      return {
        status: parsed.data.loginStep === "mfa" ? "mfa-invalid" : "invalid",
      };
    }

    throw error;
  }

  return {};
}
