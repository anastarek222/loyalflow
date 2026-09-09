"use server";

import { auth } from "@/auth";
import { z } from "zod";
import { createTrialWindow } from "@loyalflow/domain/billing/trial-core";
import {
  createWithGeneratedSlug,
  optionalBusinessPhoneValue,
} from "@/lib/business-profile";
import {
  getSafeImageDataUrl,
  imageFileToDataUrl,
  isValidRemoteImageUrl,
} from "@/lib/branding/image-data";
import { BUSINESS_LOGO_MAX_BYTES } from "@/lib/branding/image-policy";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { STANDARD_CARD_ARTWORK_CATEGORIES } from "@/lib/cards/standard-card";
import { normalizeOwnerOnboardingPhone } from "@/lib/onboarding/owner-onboarding-validation";
import {
  OWNER_ONBOARDING_DEFAULTS,
  resolveOwnerOnboardingCountryProfile,
} from "@/lib/onboarding/owner-onboarding-defaults";
import {
  canUsePendingOwnerOnboarding,
  claimPendingOwnerCompletion,
  savePendingOwnerDraft,
} from "@/lib/onboarding/pending-owner-lifecycle";
import { scheduleBusinessGoogleSheetsSync } from "@/lib/google-sheets-sync-scheduler";
import { logServerEvent } from "@/lib/server/logging";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";
import { upsertBusinessWhatsAppCredential } from "@/lib/server/integrations/business-whatsapp-credentials";
import {
  completeWhatsAppEmbeddedSignup,
  WhatsAppEmbeddedSignupError,
} from "@/lib/server/integrations/whatsapp-embedded-signup";
import { encryptBusinessWhatsAppAccessToken } from "@/lib/server/integrations/whatsapp-credential-crypto";
import {
  businessIdentityFields,
  loyaltyProgramFields,
  validateCountryProfile,
} from "@/lib/business/domain-validation";

const ownerDraftSchema = z
  .object({
    name: businessIdentityFields.name.or(z.literal("")).default(OWNER_ONBOARDING_DEFAULTS.name),
    industry: businessIdentityFields.industry.default(OWNER_ONBOARDING_DEFAULTS.industry),
    country: businessIdentityFields.country.default(OWNER_ONBOARDING_DEFAULTS.country),
    city: businessIdentityFields.city.default(OWNER_ONBOARDING_DEFAULTS.city),
    contactPhone: businessIdentityFields.contactPhone.default(OWNER_ONBOARDING_DEFAULTS.contactPhone),
    currency: businessIdentityFields.currency.default(OWNER_ONBOARDING_DEFAULTS.currency),
    timezone: businessIdentityFields.timezone.default(OWNER_ONBOARDING_DEFAULTS.timezone),
    loyaltyMode: loyaltyProgramFields.loyaltyMode.default(OWNER_ONBOARDING_DEFAULTS.loyaltyMode),
    unitName: loyaltyProgramFields.unitName.default(OWNER_ONBOARDING_DEFAULTS.unitName),
    rewardName: loyaltyProgramFields.rewardName.default(OWNER_ONBOARDING_DEFAULTS.rewardName),
    rewardThreshold: loyaltyProgramFields.rewardThreshold.default(OWNER_ONBOARDING_DEFAULTS.rewardThreshold),
    earnAmount: loyaltyProgramFields.earnAmount.default(OWNER_ONBOARDING_DEFAULTS.earnAmount),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default(OWNER_ONBOARDING_DEFAULTS.primaryColor),
    secondaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default(OWNER_ONBOARDING_DEFAULTS.secondaryColor),
    themePreset: z.enum(["DEFAULT", "DARK"]).default(OWNER_ONBOARDING_DEFAULTS.themePreset),
    logoUrl: z.string().trim().max(500).default(OWNER_ONBOARDING_DEFAULTS.logoUrl),
    standardCardArtworkEnabled: z.coerce.boolean().default(OWNER_ONBOARDING_DEFAULTS.standardCardArtworkEnabled),
    standardCardArtworkCategory: z
      .enum(STANDARD_CARD_ARTWORK_CATEGORIES)
      .default(OWNER_ONBOARDING_DEFAULTS.standardCardArtworkCategory),
  })
  .superRefine((data, context) => {
    const profileError = validateCountryProfile(data);
    if (profileError)
      context.addIssue({
        code: "custom",
        path: [profileError.field],
        message:
          profileError.reason === "COUNTRY_TIMEZONE_MISMATCH"
            ? "Choose a timezone for the selected country."
            : `Choose a valid ${profileError.field}.`,
      });
    if (
      data.logoUrl &&
      !isValidRemoteImageUrl(data.logoUrl) &&
      !getSafeImageDataUrl(data.logoUrl, BUSINESS_LOGO_MAX_BYTES)
    )
      context.addIssue({
        code: "custom",
        path: ["logoUrl"],
        message: "Upload a valid business logo.",
      });
  });

const metaIdSchema = z.string().trim().regex(/^\d{5,30}$/);
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

async function pendingOwner() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      onboardingStatus: true,
      businessId: true,
    },
  });
  if (!user || !canUsePendingOwnerOnboarding(user))
    redirect("/dashboard");
  return user;
}
async function draftFrom(formData: FormData) {
  const input = Object.fromEntries(formData);
  Object.assign(input, resolveOwnerOnboardingCountryProfile(input));
  input.contactPhone = normalizeOwnerOnboardingPhone(
    String(input.contactPhone ?? ""),
    String(input.country ?? ""),
  );
  const logoFile = formData.get("logoFile");

  if (logoFile instanceof File && logoFile.size > 0) {
    const uploadedLogo = await imageFileToDataUrl(logoFile, BUSINESS_LOGO_MAX_BYTES);
    if (!uploadedLogo)
      return ownerDraftSchema.safeParse({
        ...input,
        logoUrl: "invalid-upload",
      });
    input.logoUrl = uploadedLogo;
  }

  return ownerDraftSchema.safeParse(input);
}

function embeddedSignupFrom(formData: FormData) {
  const authorizationCode = String(
    formData.get("authorizationCode") ?? "",
  ).trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const phoneNumberId = String(formData.get("phoneNumberId") ?? "").trim();
  const wabaId = String(formData.get("wabaId") ?? "").trim();
  if (!authorizationCode && !mode && !phoneNumberId && !wabaId) return null;

  const parsed = embeddedSignupSchema.safeParse({
    authorizationCode,
    mode,
    phoneNumberId,
    wabaId,
  });
  return parsed.success ? parsed.data : false;
}

export async function saveOwnerOnboardingAction(formData: FormData) {
  const user = await pendingOwner();
  const parsed = await draftFrom(formData);
  if (!parsed.success) return { error: "Check the saved fields." };
  const saved = await savePendingOwnerDraft(
    {
      userId: user.id,
      onboardingData: parsed.data,
    },
    {
      updateMany: (input) => prisma.user.updateMany(input),
    },
  );

  if (!saved) {
    return { error: "Owner onboarding is no longer available." };
  }

  return { saved: true };
}

export async function launchOwnerOnboardingAction(formData: FormData) {
  const user = await pendingOwner();
  const parsed = await draftFrom(formData);
  const embeddedSignup = embeddedSignupFrom(formData);
  if (
    !parsed.success ||
    !parsed.data.name ||
    !parsed.data.country ||
    !parsed.data.currency ||
    !parsed.data.timezone ||
    embeddedSignup === false
  )
    redirect("/onboarding?error=incomplete");
  const data = parsed.data;

  let whatsappConnection: Awaited<
    ReturnType<typeof completeWhatsAppEmbeddedSignup>
  > | null = null;
  if (embeddedSignup) {
    try {
      whatsappConnection = await completeWhatsAppEmbeddedSignup(embeddedSignup);
    } catch (error) {
      logServerEvent("OWNER_ONBOARDING_WHATSAPP_CONNECT_FAILED", {
        userId: user.id,
        reason:
          error instanceof WhatsAppEmbeddedSignupError
            ? error.reason
            : "UNKNOWN",
      });
      redirect("/onboarding?error=whatsapp");
    }
  }

  const whatsappAccessTokenCiphertext = whatsappConnection
    ? encryptBusinessWhatsAppAccessToken(whatsappConnection.accessToken)
    : null;
  const launchedAt = new Date();
  const { business, integrationJobId } = await createWithGeneratedSlug(data.name, (slug) =>
    prisma.$transaction(async (tx) => {
      const invitations = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "OwnerInvitation"
        WHERE "email" = ${user.email}
          AND "usedAt" IS NOT NULL
        LIMIT 1
      `;
      const invitation = invitations[0];

      if (!invitation) {
        throw new Error("Owner invitation acceptance is required before onboarding");
      }

      const trialWindow = createTrialWindow(launchedAt);
      const created = await tx.business.create({
        data: {
          name: data.name,
          slug,
          industry: data.industry || null,
          country: data.country,
          city: data.city || null,
          contactPhone: optionalBusinessPhoneValue(data.contactPhone),
          currency: data.currency,
          timezone: data.timezone,
          loyaltyMode: data.loyaltyMode,
          unitName: data.unitName,
          rewardName: data.rewardName,
          rewardThreshold: data.rewardThreshold,
          earnAmount: data.earnAmount,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          themePreset: data.themePreset,
          cardStyle: "CLASSIC",
          logoUrl: data.logoUrl || null,
          standardCardArtworkEnabled: data.standardCardArtworkEnabled,
          standardCardArtworkCategory: data.standardCardArtworkCategory,
          trialStartedAt: trialWindow.startedAt,
          trialEndsAt: trialWindow.expiresAt,
        },
      });

      if (whatsappConnection && whatsappAccessTokenCiphertext) {
        await upsertBusinessWhatsAppCredential(tx, {
          businessId: created.id,
          phoneNumberId: whatsappConnection.phoneNumberId,
          wabaId: whatsappConnection.wabaId,
          accessTokenCiphertext: whatsappAccessTokenCiphertext,
        });
      }

      const ownerClaimed = await claimPendingOwnerCompletion(
        {
          userId: user.id,
          businessId: created.id,
          clearOnboardingData: Prisma.JsonNull,
        },
        {
          updateMany: (input) => tx.user.updateMany(input),
        },
      );

      if (!ownerClaimed) {
        throw new Error("Pending owner onboarding is no longer available");
      }

      const integrationJob = await enqueueIntegrationJob(tx, {
        businessId: created.id,
        kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
        idempotencyKey: `business-created:${created.id}`,
      });

      return { business: created, integrationJobId: integrationJob.id };
    }),
  );
  scheduleBusinessGoogleSheetsSync(integrationJobId);
  logServerEvent("OWNER_ONBOARDING_SHEETS_SYNC_SCHEDULED", {
    businessId: business.id,
  });
  redirect(`/businesses/${business.slug}/launch-success?sheetSync=pending`);
}
