"use server";

import { auth } from "@/auth";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { syncBusinessGoogleSheetCommand } from "@/lib/server/business/google-sheets-sync-command";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function syncGoogleSheetCommandAction(slug: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      subscriptionLifecycleState: true,
    },
  });
  if (!business) redirect("/businesses");
  if (!canManageBusiness(session.user, business.id)) redirect("/dashboard");

  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(
      `/businesses/${business.slug}/settings?sheetSync=subscription-restricted`,
    );
  }

  const result = await syncBusinessGoogleSheetCommand({ businessId: business.id });
  if (!result.ok) {
    redirect(
      `/businesses/${business.slug}/settings?sheetSync=subscription-restricted`,
    );
  }

  revalidatePath(`/businesses/${business.slug}/settings`);
  redirect(
    `/businesses/${business.slug}/settings?sheetSync=${
      result.status === "success" ? "success" : "error"
    }`,
  );
}
