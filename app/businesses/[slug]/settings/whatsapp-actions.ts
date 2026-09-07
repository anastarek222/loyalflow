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
import {
  refreshBusinessWhatsAppTemplateFromMeta,
  submitBusinessWhatsAppTemplateToMeta,
} from "@/lib/server/integrations/whatsapp-template-provider";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const connectionSchema = z.object({
  phoneNumberId: z.string().trim().regex(/^\d{5,30}$/),
  wabaId: z.string().trim().regex(/^\d{5,30}$/),
  accessToken: z.string().trim().min(20).max(4096),
});

const automaticEventSchema = z.enum([
  "WELCOME",
  "BALANCE_UPDATED",
  "REWARD_READY",
]);

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
    wabaId: formData.get("wabaId") ?? "",
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
    wabaId: parsed.data.wabaId,
    accessTokenCiphertext,
  });

  revalidatePath(`/businesses/${business.slug}/settings/whatsapp`);
  redirect(`/businesses/${business.slug}/settings/whatsapp?whatsapp=connected`);
}

export async function manageBusinessWhatsAppTemplateAction(
  slug: string,
  formData: FormData,
) {
  const business = await managedBusiness(slug);
  const event = automaticEventSchema.safeParse(formData.get("event"));
  const intent = formData.get("intent");
  if (!event.success || (intent !== "submit-template" && intent !== "refresh-template")) {
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsappTemplate=invalid`);
  }

  if (
    intent === "submit-template" &&
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsapp=subscription-restricted`);
  }

  const result =
    intent === "submit-template"
      ? await submitBusinessWhatsAppTemplateToMeta(business.id, event.data)
      : await refreshBusinessWhatsAppTemplateFromMeta(business.id, event.data);

  revalidatePath(`/businesses/${business.slug}/settings/whatsapp`);
  if (result.status === "failure") {
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsappTemplate=provider-error`);
  }

  redirect(
    `/businesses/${business.slug}/settings/whatsapp?whatsappTemplate=${result.approvalStatus.toLowerCase()}`,
  );
}
