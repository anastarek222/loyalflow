"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  OwnerInvitationRedemptionError,
  redeemOwnerInvitation,
} from "@/lib/auth/owner-invitation-runtime";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password-policy";

const acceptOwnerInvitationSchema = z.object({
  token: z.string().trim().min(20).max(256),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
  confirmPassword: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

function invitationErrorPath(token: string, error: string) {
  const query = new URLSearchParams({ token, error });
  return `/accept-owner-invitation?${query.toString()}`;
}

export async function acceptOwnerInvitationAction(formData: FormData) {
  const parsed = acceptOwnerInvitationSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect("/accept-owner-invitation?error=invalid-token");
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    redirect(invitationErrorPath(parsed.data.token, "password-mismatch"));
  }

  try {
    const result = await redeemOwnerInvitation({
      token: parsed.data.token,
      password: parsed.data.password,
    });

    if (result.status !== "success") {
      redirect("/accept-owner-invitation?error=invalid-token");
    }
  } catch (error) {
    if (error instanceof OwnerInvitationRedemptionError) {
      redirect(invitationErrorPath(parsed.data.token, "password-invalid"));
    }

    throw error;
  }

  redirect("/login?invitation=accepted");
}
