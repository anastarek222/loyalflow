"use server";

import { auth } from "@/auth";
import {
  getExperienceModeCookieName,
  isExperienceMode,
} from "@/lib/experience-mode";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function updateExperienceModeAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const mode = formData.get("experienceMode");
  if (!isExperienceMode(mode)) return;

  const cookieStore = await cookies();
  cookieStore.set(getExperienceModeCookieName(session.user.id), mode, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
