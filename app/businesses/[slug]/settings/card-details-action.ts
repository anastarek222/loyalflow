"use server";

import { auth } from "@/auth";
import { isValidBusinessPhone } from "@/lib/business-profile";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { updateBusinessCardDetailsCommand } from "@/lib/server/business/business-card-details-command";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const cardBusinessDetailsSchema = z.object({
  contactPhone: z.string().trim().refine(isValidBusinessPhone),
  address: z.string().trim().min(5).max(250),
  cardTerms: z.string().trim().min(5).max(1200),
});

/**
 * Active Card Details transport for the Settings workspace.
 *
 * The submitted slug is a route locator only. Authentication and business
 * authorization are re-established server-side before the semantic command
 * owns the authoritative persisted write.
 */
export async function updateBusinessCardDetailsCommandAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const slug = String(formData.get("businessSlug") ?? "");
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true, subscriptionLifecycleState: true },
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
      `/businesses/${business.slug}/settings?cardError=subscription-restricted`,
    );
  }

  const parsed = cardBusinessDetailsSchema.safeParse({
    contactPhone: formData.get("contactPhone"),
    address: formData.get("address"),
    cardTerms: formData.get("cardTerms"),
  });
  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/settings?cardError=invalid`);
  }

  const updated = await updateBusinessCardDetailsCommand({
    businessId: business.id,
    actor: session.user,
    contactPhone: parsed.data.contactPhone,
    address: parsed.data.address,
    cardTerms: parsed.data.cardTerms,
  });
  if (!updated.ok) {
    redirect(
      `/businesses/${business.slug}/settings?cardError=subscription-restricted`,
    );
  }

  revalidatePath(`/businesses/${business.slug}/settings`);
  revalidatePath("/card/[token]", "page");
  redirect(`/businesses/${business.slug}/settings?cardSaved=1`);
}
