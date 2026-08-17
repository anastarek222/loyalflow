"use server";

import { auth } from "@/auth";
import { parseCardDesignFormData } from "@/lib/cards/card-design-input";
import { getAuthorizedCardDesignUpdate } from "@/lib/cards/card-design-permissions";
import { imageFileToDataUrl } from "@/lib/branding/image-data";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { updateBusinessCardDesignCommand } from "@/lib/server/business/business-card-design-command";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateBusinessCardDesignCommandAction(
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
      logoUrl: true,
      cardDesignMode: true,
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
    redirect(`/businesses/${slug}/program?cardDesign=subscription-restricted`);
  }

  const logoFile = formData.get("logoFile");
  let uploadedLogoDataUrl: string | null = null;
  if (logoFile instanceof File && logoFile.size > 0) {
    uploadedLogoDataUrl = await imageFileToDataUrl(logoFile, 500 * 1024);
    if (!uploadedLogoDataUrl) {
      redirect(`/businesses/${slug}/program?cardDesign=invalid`);
    }
  }

  const parsed = parseCardDesignFormData(formData);
  if (!parsed.success) {
    redirect(`/businesses/${slug}/program?cardDesign=invalid`);
  }

  const authorizedUpdate = getAuthorizedCardDesignUpdate({
    role: session.user.role,
    currentDesignMode: business.cardDesignMode,
    submitted: parsed.data,
  });
  if (!authorizedUpdate.allowed) {
    redirect(
      `/businesses/${slug}/program?cardDesign=${
        authorizedUpdate.reason === "CUSTOM_READ_ONLY"
          ? "readonly"
          : "forbidden"
      }`,
    );
  }

  const submittedLogoUrl = uploadedLogoDataUrl ?? parsed.data.logoUrl;
  const finalLogoUrl =
    formData.get("removeLogo") === "on"
      ? null
      : submittedLogoUrl || business.logoUrl;

  const result = await updateBusinessCardDesignCommand({
    businessId: business.id,
    actor: session.user,
    authorizedData: authorizedUpdate.data,
    logoUrl: finalLogoUrl,
  });
  if (!result.ok) {
    redirect(`/businesses/${slug}/program?cardDesign=subscription-restricted`);
  }

  revalidatePath(`/businesses/${business.slug}/settings`);
  revalidatePath(`/businesses/${business.slug}/program`);
  revalidatePath("/card/[token]", "page");
  redirect(`/businesses/${business.slug}/program?cardDesign=saved`);
}
