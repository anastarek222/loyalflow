"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getAuthorizedBusiness(
  slug: string
) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business =
    await prisma.business.findUnique({
      where: {
        slug,
      },

      select: {
        id: true,
        slug: true,
      },
    });

  if (!business) {
    redirect("/businesses");
  }

  const canAccess =
    session.user.role ===
      "SUPER_ADMIN" ||
    session.user.businessId ===
      business.id;

  if (!canAccess) {
    redirect("/dashboard");
  }

  return {
    session,
    business,
  };
}

function validateNotificationKey(
  notificationKey: string
) {
  const isValid =
    notificationKey.length <= 250 &&
    /^(activity|reward-ready):[A-Za-z0-9:_-]+$/.test(
      notificationKey
    );

  if (!isValid) {
    throw new Error(
      "Invalid notification key"
    );
  }
}

export async function markBusinessNotificationsReadAction(
  slug: string
) {
  const {
    session,
    business,
  } = await getAuthorizedBusiness(slug);

  const readAt = new Date();

  await prisma.$transaction([
    prisma.notificationReadState.upsert({
      where: {
        userId_businessId: {
          userId: session.user.id,
          businessId: business.id,
        },
      },

      update: {
        lastReadAt: readAt,
      },

      create: {
        userId: session.user.id,
        businessId: business.id,
        lastReadAt: readAt,
      },
    }),

    prisma.notificationItemRead.deleteMany({
      where: {
        userId: session.user.id,
        businessId: business.id,
      },
    }),

  ]);

  revalidatePath(
    `/businesses/${business.slug}`
  );

  return {
    success: true,
  };
}

export async function markBusinessNotificationItemReadAction(
  slug: string,
  notificationKey: string
) {
  validateNotificationKey(
    notificationKey
  );

  const {
    session,
    business,
  } = await getAuthorizedBusiness(slug);

  await prisma.notificationItemRead.upsert({
    where: {
      userId_businessId_notificationKey: {
        userId: session.user.id,
        businessId: business.id,
        notificationKey,
      },
    },

    update: {
      readAt: new Date(),
    },

    create: {
      userId: session.user.id,
      businessId: business.id,
      notificationKey,
      readAt: new Date(),
    },
  });

  revalidatePath(
    `/businesses/${business.slug}`
  );

  return {
    success: true,
  };
}
