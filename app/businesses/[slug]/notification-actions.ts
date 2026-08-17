"use server";

import { auth } from "@/auth";
import { canAccessBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  markBusinessNotificationItemReadCommand,
  markBusinessNotificationsReadCommand,
} from "@/lib/server/business/notification-read-command";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getAuthorizedBusiness(slug: string) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!business) {
    redirect("/businesses");
  }

  if (!canAccessBusiness(session.user, business.id)) {
    redirect("/dashboard");
  }

  return { session, business };
}

export async function markBusinessNotificationsReadAction(slug: string) {
  const { session, business } = await getAuthorizedBusiness(slug);

  await markBusinessNotificationsReadCommand({
    userId: session.user.id,
    businessId: business.id,
  });

  revalidatePath(`/businesses/${business.slug}`);

  return { success: true };
}

export async function markBusinessNotificationItemReadAction(
  slug: string,
  notificationKey: string,
) {
  const { session, business } = await getAuthorizedBusiness(slug);

  await markBusinessNotificationItemReadCommand({
    userId: session.user.id,
    businessId: business.id,
    notificationKey,
  });

  revalidatePath(`/businesses/${business.slug}`);

  return { success: true };
}
