"use server";

import { auth } from "@/auth";
import { z } from "zod";
import {
  createWithGeneratedSlug,
  isSupportedCurrency,
  isValidBusinessPhone,
  isValidIanaTimezone,
  optionalBusinessPhoneValue,
} from "@/lib/business-profile";
import {
  getSafeImageDataUrl,
  imageFileToDataUrl,
  isValidRemoteImageUrl,
} from "@/lib/branding/image-data";
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { STANDARD_CARD_ARTWORK_CATEGORIES } from "@/lib/cards/standard-card";
import { normalizeOwnerOnboardingPhone } from "@/lib/onboarding/owner-onboarding-validation";

const ownerDraftSchema = z
  .object({
    name: z.string().trim().max(80).default(""),
    industry: z.string().trim().max(100).default(""),
    country: z.string().trim().max(100).default(""),
    city: z.string().trim().max(100).default(""),
    contactPhone: z.string().trim().max(25).default(""),
    currency: z.string().trim().max(3).default(""),
    timezone: z.string().trim().max(100).default(""),
    loyaltyMode: z.enum(["VISITS", "POINTS", "SALES_AMOUNT"]).default("VISITS"),
    unitName: z.string().trim().max(30).default("Visit"),
    rewardName: z.string().trim().max(100).default("Reward"),
    rewardThreshold: z.coerce.number().int().min(1).max(1_000_000).default(5),
    earnAmount: z.coerce.number().int().min(1).max(1_000_000).default(1),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#111827"),
    themePreset: z.enum(["DEFAULT", "DARK"]).default("DEFAULT"),
    logoUrl: z.string().trim().max(500).default(""),
    standardCardArtworkEnabled: z.coerce.boolean().default(true),
    standardCardArtworkCategory: z
      .enum(STANDARD_CARD_ARTWORK_CATEGORIES)
      .default("OTHER"),
  })
  .superRefine((data, context) => {
    const country = COUNTRY_OPTIONS.find(
      (option) => option.name === data.country,
    );
    if (!country)
      context.addIssue({
        code: "custom",
        path: ["country"],
        message: "Choose a valid country.",
      });
    if (data.currency && !isSupportedCurrency(data.currency))
      context.addIssue({
        code: "custom",
        path: ["currency"],
        message: "Choose a valid currency.",
      });
    if (data.timezone && !isValidIanaTimezone(data.timezone))
      context.addIssue({
        code: "custom",
        path: ["timezone"],
        message: "Choose a valid timezone.",
      });
    if (
      country?.timezones?.length &&
      data.timezone &&
      !country.timezones.includes(data.timezone)
    )
      context.addIssue({
        code: "custom",
        path: ["timezone"],
        message: "Choose a timezone for the selected country.",
      });
    if (data.contactPhone && !isValidBusinessPhone(data.contactPhone))
      context.addIssue({
        code: "custom",
        path: ["contactPhone"],
        message: "Enter a valid international phone number.",
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
  if (!user || user.role !== "OWNER") redirect("/dashboard");
  if (user.onboardingStatus !== "PENDING" || user.businessId)
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
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingData: parsed.data },
  });
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
  const business = await createWithGeneratedSlug(data.name, (slug) =>
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
          secondaryColor: "#FFFFFF",
          themePreset: data.themePreset,
          cardStyle: "CLASSIC",
          logoUrl: data.logoUrl || null,
          standardCardArtworkEnabled: data.standardCardArtworkEnabled,
          standardCardArtworkCategory: data.standardCardArtworkCategory,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          businessId: created.id,
          onboardingStatus: "COMPLETE",
          onboardingData: Prisma.JsonNull,
        },
      });
      return created;
    }),
  );
  redirect(`/businesses/${business.slug}`);
}
