"use server";

import { auth } from "@/auth";
import { findCustomCardArtworkVersion } from "@/lib/cards/custom-card-storage";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { publishCustomCardArtworkCommand } from "@/lib/server/business/custom-card-publish-command";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Active Custom Card publish transport for the Program workspace.
 *
 * Authentication, Super Admin authorization, complete version selection,
 * storage lookup, presentation preflight, redirects and revalidation stay in
 * the Server Action. Authoritative Business persistence and audit ownership
 * live in the command.
 */
export async function publishCustomCardArtworkAction(
  slug: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true, subscriptionLifecycleState: true },
  });
  if (!business) redirect("/businesses");

  if (
    session.user.role !== "SUPER_ADMIN" ||
    !canManageBusiness(session.user, business.id)
  ) {
    redirect(`/businesses/${slug}/program?cardDesign=forbidden`);
  }

  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${slug}/program?cardDesign=subscription-restricted`);
  }

  const version = String(formData.get("customVersion") ?? "");
  const artwork = await findCustomCardArtworkVersion(business.id, version);
  if (!artwork?.frontUrl || !artwork.backUrl) {
    redirect(`/businesses/${slug}/program?cardDesign=invalid`);
  }

  const published = await publishCustomCardArtworkCommand({
    businessId: business.id,
    actor: session.user,
    version,
    frontUrl: artwork.frontUrl,
    backUrl: artwork.backUrl,
  });
  if (!published.ok) {
    redirect(`/businesses/${slug}/program?cardDesign=subscription-restricted`);
  }

  revalidatePath(`/businesses/${business.slug}/program`);
  revalidatePath("/card/[token]", "page");
  // The token/side artwork proxy already sends Cache-Control: no-store, so the
  // newly persisted pair is fetched on the next customer-card request.
  redirect(`/businesses/${slug}/program?cardDesign=saved`);
}