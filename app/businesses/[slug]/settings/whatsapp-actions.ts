"use server";

import { auth } from "@/auth";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  deleteBusinessWhatsAppCredential,
  upsertBusinessWhatsAppCredential,
} from "@/lib/server/integrations/business-whatsapp-credentials";
import { upsertBusinessWhatsAppAutomationSettings } from "@/lib/server/integrations/business-whatsapp-automation-settings";
import {
  completeWhatsAppEmbeddedSignup,
  WhatsAppEmbeddedSignupError,
} from "@/lib/server/integrations/whatsapp-embedded-signup";
import { encryptBusinessWhatsAppAccessToken } from "@/lib/server/integrations/whatsapp-credential-crypto";
import {
  refreshBusinessWhatsAppTemplateFromMeta,
  submitBusinessWhatsAppTemplateToMeta,
} from "@/lib/server/integrations/whatsapp-template-provider";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const metaIdSchema = z.string().trim().regex(/^\d{5,30}$/);
const ownerMessageSchema = z.string().trim().max(2000);

const connectionSchema = z.object({
  phoneNumberId: metaIdSchema,
  wabaId: metaIdSchema,
  accessToken: z.string().trim().min(20).max(4096),
});

const embeddedSignupSchema = z
  .object({
    authorizationCode: z.string().trim().min(20).max(4096),
    mode: z.enum(["STANDARD", "COEXISTENCE"]),
    phoneNumberId: z.string().trim().max(30),
    wabaId: metaIdSchema,
  })
  .superRefine((value, context) => {
    if (value.mode === "STANDARD") {
      if (!metaIdSchema.safeParse(value.phoneNumberId).success) {
        context.addIssue({
          code: "custom",
          path: ["phoneNumberId"],
          message: "Standard Embedded Signup requires a valid phone number ID.",
        });
      }
      return;
    }

    if (
      value.phoneNumberId &&
      !metaIdSchema.safeParse(value.phoneNumberId).success
    ) {
      context.addIssue({
        code: "custom",
        path: ["phoneNumberId"],
        message: "Coexistence phone number ID must be valid when Meta supplies one.",
      });
    }
  });

const automaticEventSchema = z.enum([
  "WELCOME",
  "BALANCE_UPDATED",
  "REWARD_READY",
  "REWARD_REDEEMED",
  "NEW_REWARD",
  "NEW_OFFER",
]);

const automationSettingsSchema = z.object({
  whatsappWelcomeMessage: ownerMessageSchema,
  whatsappBalanceMessage: ownerMessageSchema,
  whatsappRewardMessage: ownerMessageSchema,
  whatsappRedeemedMessage: ownerMessageSchema,
  newRewardMessage: ownerMessageSchema,
  newOfferMessage: ownerMessageSchema,
  paused: z.boolean(),
  welcomeEnabled: z.boolean(),
  balanceUpdatedEnabled: z.boolean(),
  rewardReadyEnabled: z.boolean(),
  rewardRedeemedEnabled: z.boolean(),
  newRewardEnabled: z.boolean(),
  newOfferEnabled: z.boolean(),
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

export async function completeBusinessWhatsAppEmbeddedSignupAction(
  slug: string,
  formData: FormData,
) {
  const business = await managedBusiness(slug);
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsapp=subscription-restricted`);
  }

  const parsed = embeddedSignupSchema.safeParse({
    authorizationCode: formData.get("authorizationCode") ?? "",
    mode: formData.get("mode") ?? "",
    phoneNumberId: formData.get("phoneNumberId") ?? "",
    wabaId: formData.get("wabaId") ?? "",
  });
  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsapp=embedded-invalid`);
  }

  try {
    const connection = await completeWhatsAppEmbeddedSignup(parsed.data);
    const accessTokenCiphertext = encryptBusinessWhatsAppAccessToken(
      connection.accessToken,
    );
    await upsertBusinessWhatsAppCredential(prisma, {
      businessId: business.id,
      phoneNumberId: connection.phoneNumberId,
      wabaId: connection.wabaId,
      accessTokenCiphertext,
    });
  } catch (error) {
    const status =
      error instanceof WhatsAppEmbeddedSignupError &&
      error.reason === "NOT_CONFIGURED"
        ? "embedded-not-configured"
        : "embedded-failed";
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsapp=${status}`);
  }

  revalidatePath(`/businesses/${business.slug}/settings/whatsapp`);
  redirect(`/businesses/${business.slug}/settings/whatsapp?whatsapp=connected`);
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

export async function updateBusinessWhatsAppAutomationAction(
  slug: string,
  formData: FormData,
) {
  const business = await managedBusiness(slug);
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsappAutomation=subscription-restricted`);
  }

  const checked = (key: string) => formData.get(key) === "on";
  const parsed = automationSettingsSchema.safeParse({
    whatsappWelcomeMessage: formData.get("whatsappWelcomeMessage") ?? "",
    whatsappBalanceMessage: formData.get("whatsappBalanceMessage") ?? "",
    whatsappRewardMessage: formData.get("whatsappRewardMessage") ?? "",
    whatsappRedeemedMessage: formData.get("whatsappRedeemedMessage") ?? "",
    newRewardMessage: formData.get("newRewardMessage") ?? "",
    newOfferMessage: formData.get("newOfferMessage") ?? "",
    paused: checked("paused"),
    welcomeEnabled: checked("welcomeEnabled"),
    balanceUpdatedEnabled: checked("balanceUpdatedEnabled"),
    rewardReadyEnabled: checked("rewardReadyEnabled"),
    rewardRedeemedEnabled: checked("rewardRedeemedEnabled"),
    newRewardEnabled: checked("newRewardEnabled"),
    newOfferEnabled: checked("newOfferEnabled"),
  });
  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/settings/whatsapp?whatsappAutomation=invalid`);
  }

  const copy = parsed.data;
  await prisma.$transaction(async (transaction) => {
    await transaction.business.update({
      where: { id: business.id },
      data: {
        whatsappWelcomeMessage: copy.whatsappWelcomeMessage || null,
        whatsappBalanceMessage: copy.whatsappBalanceMessage || null,
        whatsappRewardMessage: copy.whatsappRewardMessage || null,
        whatsappRedeemedMessage: copy.whatsappRedeemedMessage || null,
      },
    });
    await upsertBusinessWhatsAppAutomationSettings(transaction, {
      businessId: business.id,
      paused: copy.paused,
      welcomeEnabled: copy.welcomeEnabled,
      balanceUpdatedEnabled: copy.balanceUpdatedEnabled,
      rewardReadyEnabled: copy.rewardReadyEnabled,
      rewardRedeemedEnabled: copy.rewardRedeemedEnabled,
      newRewardEnabled: copy.newRewardEnabled,
      newOfferEnabled: copy.newOfferEnabled,
      newRewardMessage: copy.newRewardMessage || null,
      newOfferMessage: copy.newOfferMessage || null,
    });
  });

  revalidatePath(`/businesses/${business.slug}/settings/whatsapp`);
  redirect(`/businesses/${business.slug}/settings/whatsapp?whatsappAutomation=saved`);
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
