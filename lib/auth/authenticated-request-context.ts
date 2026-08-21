import { cache } from "react";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const getAuthenticatedRequestContext = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      language: true,
      firstName: true,
      lastName: true,
      email: true,
      id: true,
      role: true,
      experienceAccess: true,
      businessId: true,
      onboardingStatus: true,
      business: {
        select: {
          slug: true,
          name: true,
          plan: true,
        },
      },
    },
  });

  return {
    session,
    user,
  };
});
