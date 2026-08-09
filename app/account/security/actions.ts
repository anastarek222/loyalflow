"use server";

import { auth, signOut } from "@/auth";
import { parseActivityRequestContext } from "@/lib/activity/request-context";
import { isValidAuthVersion } from "@/lib/auth/auth-version";
import { processPasswordChangeSubmission } from "@/lib/auth/password-change-action";
import type { PasswordChangeError } from "@/lib/auth/password-change-copy";
import { changeAuthenticatedUserPassword } from "@/lib/auth/password-change";
import { revokeAuthenticatedUserSessions } from "@/lib/auth/logout-everywhere";
import {
  distributedRateLimit,
  getClientAddress,
} from "@/lib/utils/rate-limiter";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChangePasswordState = {
  error?: PasswordChangeError;
};

export type LogoutEverywhereState = {
  error?: "failed";
};

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const requestHeaders = await headers();
  const result = await processPasswordChangeSubmission(
    {
      sessionUser: session.user,
      clientAddress: getClientAddress(requestHeaders),
      formData,
    },
    {
      rateLimit(key) {
        return distributedRateLimit(key, {
          limit: 5,
          windowMs: 15 * 60 * 1000,
        });
      },
      changePassword(input) {
        return changeAuthenticatedUserPassword({
          ...input,
          activityContext: parseActivityRequestContext(requestHeaders),
        });
      },
    },
  );

  if (result.status === "error") {
    return { error: result.error };
  }

  if (result.status === "unauthenticated") {
    redirect("/login");
  }

  await signOut({
    redirectTo: `/login?password=changed&language=${result.language}`,
  });

  return {};
}

export async function logoutEverywhereAction(
  _previousState: LogoutEverywhereState,
  _formData: FormData,
): Promise<LogoutEverywhereState> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!isValidAuthVersion(session.user.authVersion)) {
    return { error: "failed" };
  }

  try {
    const result = await revokeAuthenticatedUserSessions({
      userId: session.user.id,
      expectedAuthVersion: session.user.authVersion,
    });

    if (result.status !== "success") {
      return { error: "failed" };
    }
  } catch {
    return { error: "failed" };
  }

  await signOut({
    redirectTo: "/login",
  });

  return {};
}
