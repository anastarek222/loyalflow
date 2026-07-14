"use server";

import { auth } from "@/auth";

import {
  isAppLanguage,
} from "@/lib/i18n";

import prisma from "@/lib/prisma";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

export async function updateUserLanguageAction(
  formData: FormData
): Promise<void> {
  const session =
    await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const language =
    formData.get(
      "language"
    );

  if (
    !isAppLanguage(
      language
    )
  ) {
    return;
  }

  await prisma.user.update({
    where: {
      id:
        session.user.id,
    },

    data: {
      language,
    },
  });

  revalidatePath(
    "/",
    "layout"
  );
}
