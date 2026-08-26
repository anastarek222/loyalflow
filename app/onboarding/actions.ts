"use server";

import { auth } from "@/auth";
import { z } from "zod";
import {
  createWithGeneratedSlug,
  optionalBusinessPhoneValue,
} from "@/lib/business-profile";
import {
  getSafeImageDataUrl,
  imageFileToDataUrl,
  isValidRemoteImageUrl,
} from "@/lib/branding/image-data";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { STANDARD_CARD_ARTWORK_CATEGORIES } from "@/lib/cards/standard-card";
import { normalizeOwnerOnboardingPhone } from "@/lib/onboarding/owner-onboarding-validation";
import {
  canUsePendingOwnerOnboarding,
  claimPendingOwnerCompletion,
  savePendingOwnerDraft,
} from "@/lib/onboarding/pending-owner-lifecycle";
import { scheduleBusinessGoogleSheetsSync } from "@/lib/google-sheets-sync-scheduler";
import { logServerEvent } from "@/lib/server/logging";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";
import {
  businessIdentityFields,
  loyaltyProgramFields,
  validateCountryProfile,
} from "@/lib/business/domain-validation";

const ownerDraftSchema = z
  .object({
    name: businessIdentityFields.name.or(z.literal("")).default(""),
    industry: businessIdentityFields.industry.default(""),
    country: businessIdentityFields.country.default(""),
    city: businessIdentityFields.city.default(""),
    contactPhone: businessIdentityFields.contactPhone.default(""),
    currency: businessIdentityFields.currency.default(""),
    timezone: businessIdentityFields.timezone.default(""),
    loyaltyMode: loyaltyProgramFields.loyaltyMode.default("VISITS"),
    unitName: loyaltyProgramFields.unitName.default("Visit"),
    rewardName: loyaltyProgramFields.rewardName.default("Reward"),
    rewardThreshold: loyaltyProgramFields.rewardThreshold.default(5),
    earnAmount: loyaltyProgramFields.earnAmount.default(1),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#111827"),
    secondaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#FFFFFF"),
    themePreset: z.enum(["DEFAULT", "DARK"]).default("DEFAULT"),
    logoUrl: z.string().trim().max(500).default(""),
    standardCardArtworkEnabled: z.coerce.boolean().default(true),
    standardCardArtworkCategory: z
      .enum(STANDARD_CARD_ARTWORK_CATEGORIES)
      .default("OTHER"),
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
      !getSafeImageDataUrl(data.logoUrl, 500 * 1024)
    )
      context.addIssue({
        code: "custom",
        path: ["logoUrl"],
        message: "Upload a valid business logo.",
      });
  });

async function pendingOwner() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, onboardingStatus: true, businessId: true },
  });
  if (!user || !canUsePendingOwnerOnboarding(user))
    redirect("/dashboard");
  return user;
}
async function draftFrom(formData: FormData) {
  const input = Object.fromEntries(formData);
  input.contactPhone = normalizeOwnerOnboardingPhone(
    String(input.contactPhone ?? ""),
    String(input.country ?? ""),
  );
  const logoFile = formData.get("logoFile");

  if (logoFile instanceof File && logoFile.size > 0) {
    const uploadedLogo = await imageFileToDataUrl(logoFile, 500 * 1024);
    if (!uploadedLogo)
      return ownerDraftSchema.safeParse({
        ...input,
        logoUrl: "invalid-upload",
      });
    input.logoUrl = uploadedLogo;
  }

  return ownerDraftSchema.safeParse(input);
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
  if (
    !parsed.success ||
    !parsed.data.name ||
    !parsed.data.country ||
    !parsed.data.currency ||
    !parsed.data.timezone
  )
    redirect("/onboarding?error=incomplete");
  const data = parsed.data;
  const { business, integrationJobId } = await createWithGeneratedSlug(data.name, (slug) =>
    prisma.$transaction(async (tx) => {
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
        },
      });
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
  redirect(`/businesses/${business.slug}?sheetSync=pending`);
}
