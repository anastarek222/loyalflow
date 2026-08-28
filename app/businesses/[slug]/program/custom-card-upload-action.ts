"use server";

import { auth } from "@/auth";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { uploadCustomCardDraftCommand } from "@/lib/server/business/custom-card-upload-command";
import { redirect } from "next/navigation";

const uploadErrorState = {
  MISSING_FRONT: "missing-front",
  MISSING_BACK: "missing-back",
  UNSUPPORTED_TYPE: "unsupported-type",
  PAIR_TOO_LARGE: "pair-too-large",
  UNREADABLE_IMAGE: "unreadable-image",
  DIMENSIONS_MISMATCH: "dimensions-mismatch",
  WRONG_ASPECT_RATIO: "wrong-aspect-ratio",
} as const;

export async function uploadCustomCardDraftCommandAction(
  slug: string,
  formData: FormData,
) {
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

  if (
    session.user.role !== "SUPER_ADMIN" ||
    !canManageBusiness(session.user, business.id)
  ) {
    redirect(`/businesses/${business.slug}/program?cardDesign=forbidden`);
  }

  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "EXPAND",
    )
  ) {
    redirect(
      `/businesses/${business.slug}/program?cardDesign=subscription-restricted`,
    );
  }

  const result = await uploadCustomCardDraftCommand({
    businessId: business.id,
    front: formData.get("customCardFrontFile"),
    back: formData.get("customCardBackFile"),
  });

  if (!result.ok) {
    if (result.reason === "SUBSCRIPTION_RESTRICTED") {
      redirect(
        `/businesses/${business.slug}/program?cardDesign=subscription-restricted`,
      );
    }
    if (result.reason === "STORAGE_UNAVAILABLE") {
      redirect(
        `/businesses/${business.slug}/program?cardDesign=storage-unavailable`,
      );
    }
    const errorState = uploadErrorState[result.reason];
    redirect(
      `/businesses/${business.slug}/program?cardDesign=${errorState}`,
    );
  }

  redirect(
    `/businesses/${business.slug}/program?cardDesign=draft&customVersion=${result.version}`,
  );
}
