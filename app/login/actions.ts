"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

async function runCredentialsSignIn(
  formData: FormData,
  failurePath: "/login" | "/login/super-admin",
) {
  formData.set("redirectTo", "/dashboard");

  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`${failurePath}?error=invalid`);
    }

    throw error;
  }
}

export async function loginAction(formData: FormData) {
  formData.set("mfaCode", "");
  await runCredentialsSignIn(formData, "/login");
}

export async function superAdminLoginAction(formData: FormData) {
  await runCredentialsSignIn(formData, "/login/super-admin");
}
