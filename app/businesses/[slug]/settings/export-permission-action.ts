"use server";

import { auth } from "@/auth";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import prisma from "@/lib/prisma";
import { updateBusinessExportPermissionCommand } from "@/lib/server/business/business-export-permission-command";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateBusinessExportPermissionCommandAction(
  slug: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      allowOwnerDataExport: true,
      subscriptionLifecycleState: true,
    },
  });
  if (!business) {
    redirect("/businesses");
  }

  const allowOwnerDataExport = formData.get("allowOwnerDataExport") === "on";
  if (allowOwnerDataExport === business.allowOwnerDataExport) {
    redirect(`/businesses/${business.slug}/settings?exportPermissionSaved=1`);
  }

  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(
      `/businesses/${business.slug}/settings?exportPermissionSaved=subscription-restricted`,
    );
  }

  const result = await updateBusinessExportPermissionCommand({
    businessId: business.id,
    actor: session.user,
    allowOwnerDataExport,
  });
  if (!result.ok) {
    redirect(
      `/businesses/${business.slug}/settings?exportPermissionSaved=subscription-restricted`,
    );
  }

  revalidatePath(`/businesses/${business.slug}`);
  revalidatePath(`/businesses/${business.slug}/customers`);
  revalidatePath(`/businesses/${business.slug}/reports`);
  revalidatePath(`/businesses/${business.slug}/settings`);
  revalidatePath(`/businesses/${business.slug}/activity`);

  redirect(`/businesses/${business.slug}/settings?exportPermissionSaved=1`);
}
