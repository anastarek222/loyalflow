import { cache } from "react";

import { auth } from "@/auth";
import { normalizeLanguage, type AppLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";

export const getAuthenticatedAppLanguage = cache(async (): Promise<AppLanguage> => {
  const session = await auth();
  if (!session?.user?.id) return "AR";

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });

  return normalizeLanguage(user?.language);
});
