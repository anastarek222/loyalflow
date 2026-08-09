"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { verifyEmail } from "@/lib/auth/email-verification-runtime";

const verifyEmailSchema = z.object({
  token: z.string().trim().min(20).max(256),
});

export async function verifyEmailAction(formData: FormData) {
  const parsed = verifyEmailSchema.safeParse({
    token: formData.get("token"),
  });

  if (!parsed.success) {
    redirect("/verify-email?error=invalid-token");
  }

  const result = await verifyEmail({ token: parsed.data.token });

  if (result.status !== "success") {
    redirect("/verify-email?error=invalid-token");
  }

  redirect("/login?verification=success");
}
