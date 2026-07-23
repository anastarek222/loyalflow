"use server";

import { auth } from "@/auth";
import {
  assertTenantScopedNotificationReadTarget,
  notificationItemReadWhere,
  notificationReadStateWhere,
} from "@/lib/notification-read-state";
import { canAccessBusiness } from "@/lib/permissions";
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
        rewardThreshold: true,
      },
    });

  if (!business) {
    redirect("/businesses");
  }

  if (!canAccessBusiness(session.user, business.id)) {
    redirect("/dashboard");
  }

  return {
    session,
    business,
  };
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
        ...notificationReadStateWhere({
          userId: session.user.id,
          businessId: business.id,
        }),
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
  const {
    session,
    business,
  } = await getAuthorizedBusiness(slug);

  await assertTenantScopedNotificationReadTarget({
    notificationKey,
    businessId: business.id,
    userId: session.user.id,
    rewardThreshold: business.rewardThreshold,
    lookup: {
      findNotification: (id) =>
        prisma.notification.findUnique({
          where: { id },
          select: { businessId: true, userId: true },
        }),
      findActivity: (id) =>
        prisma.businessActivity.findUnique({
          where: { id },
          select: { businessId: true, type: true },
        }),
      findRewardReadyCustomer: ({ id, balance, lifetimeRedeemed }) =>
        prisma.customer.findFirst({
          where: {
            id,
            businessId: business.id,
            balance,
            lifetimeRedeemed,
          },
          select: { businessId: true, isActive: true },
        }),
    },
  });

  const readAt = new Date();

  await prisma.notificationItemRead.upsert({
    where: {
      ...notificationItemReadWhere({
        userId: session.user.id,
        businessId: business.id,
        notificationKey,
      }),
    },

    update: {
      readAt,
    },

    create: {
      userId: session.user.id,
      businessId: business.id,
      notificationKey,
      readAt,
    },
  });

  revalidatePath(
    `/businesses/${business.slug}`
  );

  return {
    success: true,
  };
}
