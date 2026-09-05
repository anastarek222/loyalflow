"use server";

import { auth } from "@/auth";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  deleteBusinessWhatsAppCredential,
  upsertBusinessWhatsAppCredential,
} from "@/lib/server/integrations/business-whatsapp-credentials";
import { encryptBusinessWhatsAppAccessToken } from "@/lib/server/integrations/whatsapp-credential-crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const connectionSchema = z.object({
  phoneNumberId: z.string().trim().regex(/^\d{5,30}$/),
  accessToken: z.string().trim().min(20).max(4096),
});

async function managedBusiness(slug: string) {
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
  return business;
}

export async function updateBusinessWhatsAppConnectionAction(
  slug: string,
  formData: FormData,
) {
  const business = await managedBusiness(slug);
  const intent = formData.get("intent");

  if (intent === "disconnect") {
    await deleteBusinessWhatsAppCredential(prisma, business.id);
    revalidatePath(`/businesses/${business.slug}/settings/whatsapp`);
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsapp=disconnected`);
  }

  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsapp=subscription-restricted`);
  }

  const parsed = connectionSchema.safeParse({
    phoneNumberId: formData.get("phoneNumberId") ?? "",
    accessToken: formData.get("accessToken") ?? "",
  });
  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsapp=invalid`);
  }

  const accessTokenCiphertext = encryptBusinessWhatsAppAccessToken(
    parsed.data.accessToken,
  );
  await upsertBusinessWhatsAppCredential(prisma, {
    businessId: business.id,
    phoneNumberId: parsed.data.phoneNumberId,
    accessTokenCiphertext,
  });

  revalidatePath(`/businesses/${business.slug}/settings/whatsapp`);
  redirect(`/businesses/${business.slug}/settings/whatsapp?whatsapp=connected`);
}
