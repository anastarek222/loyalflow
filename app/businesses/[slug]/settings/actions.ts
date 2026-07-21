"use server";

import { auth } from "@/auth";
import {
  isSupportedCurrency,
  isValidIanaTimezone,
  isValidBusinessPhone,
  optionalProfileValue,
} from "@/lib/business-profile";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const cardBusinessDetailsSchema = z.object({
  contactPhone: z.string().trim().refine(isValidBusinessPhone),

  address: z.string().trim().min(5).max(250),

  cardTerms: z.string().trim().min(5).max(1200),
});

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),

  logoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      if (value === "") {
        return true;
      }

      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }),

  coverImageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      if (value === "") {
        return true;
      }

      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }),

  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),

  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),

  currency: z
    .string()
    .trim()
    .refine((value) => value === "" || isSupportedCurrency(value)),

  timezone: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidIanaTimezone(value)),

  loyaltyProgramName: z.string().trim().max(80),
  pointsName: z.string().trim().max(30),
  membershipName: z.string().trim().max(50),
  welcomeMessage: z.string().trim().max(300),

  cardDefaultLanguage: z.enum(["AR", "EN"]),

  staffAttributionMode: z.enum(["OFF", "OPTIONAL", "REQUIRED"]),

  loyaltyMode: z.enum(["VISITS", "POINTS", "SALES_AMOUNT"]),

  unitName: z.string().trim().min(1).max(30),

  rewardName: z.string().trim().min(2).max(100),

  rewardType: z.enum(["GIFT", "PROMO_CODE", "DISCOUNT", "CUSTOM"]),

  rewardCode: z.string().trim().max(80),

  rewardDescription: z.string().trim().max(300),

  rewardThreshold: z.coerce.number().int().min(1).max(1000000),

  earnAmount: z.coerce.number().int().min(1).max(1000000),

  whatsappWelcomeMessage: z.string().trim().min(1).max(1500),

  whatsappBalanceMessage: z.string().trim().min(1).max(1500),

  whatsappRewardMessage: z.string().trim().min(1).max(1500),
});

export async function updateBusinessSettingsAction(
  slug: string,
  formData: FormData,
) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      slug: true,
      logoUrl: true,
    },
  });

  if (!business) {
    redirect("/businesses");
  }

  const canManage = canManageBusiness(session.user, business.id);

  if (!canManage) {
    redirect("/dashboard");
  }

  const removeLogo = formData.get("removeLogo") === "on";

  const logoFile = formData.get("logoFile");

  let uploadedLogoDataUrl: string | null = null;

  if (logoFile instanceof File && logoFile.size > 0) {
    const allowedLogoTypes = ["image/png", "image/jpeg", "image/webp"];

    if (
      logoFile.size > 500 * 1024 ||
      !allowedLogoTypes.includes(logoFile.type)
    ) {
      redirect(`/businesses/${business.slug}/settings?error=invalid`);
    }

    const logoBuffer = Buffer.from(await logoFile.arrayBuffer());

    uploadedLogoDataUrl =
      `data:${logoFile.type};base64,` + logoBuffer.toString("base64");
  }

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl") ?? "",
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    currency: formData.get("currency") ?? "",
    timezone: formData.get("timezone") ?? "",
    loyaltyProgramName: formData.get("loyaltyProgramName") ?? "",
    pointsName: formData.get("pointsName") ?? "",
    membershipName: formData.get("membershipName") ?? "",
    welcomeMessage: formData.get("welcomeMessage") ?? "",
    cardDefaultLanguage: formData.get("cardDefaultLanguage"),
    staffAttributionMode: formData.get("staffAttributionMode"),
    loyaltyMode: formData.get("loyaltyMode"),
    unitName: formData.get("unitName"),
    rewardName: formData.get("rewardName"),
    rewardType: formData.get("rewardType"),
    rewardCode: formData.get("rewardCode") ?? "",
    rewardDescription: formData.get("rewardDescription") ?? "",
    rewardThreshold: formData.get("rewardThreshold"),
    earnAmount: formData.get("earnAmount"),
    whatsappWelcomeMessage: formData.get("whatsappWelcomeMessage"),
    whatsappBalanceMessage: formData.get("whatsappBalanceMessage"),
    whatsappRewardMessage: formData.get("whatsappRewardMessage"),
  });

  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/settings?error=invalid`);
  }

  if (
    parsed.data.rewardType === "PROMO_CODE" &&
    parsed.data.rewardCode.length < 2
  ) {
    redirect(`/businesses/${business.slug}/settings?error=invalid`);
  }

  const submittedLogoUrl = parsed.data.logoUrl || null;

  const finalLogoUrl = removeLogo
    ? null
    : (uploadedLogoDataUrl ?? submittedLogoUrl ?? business.logoUrl);

  await prisma.$transaction([
    prisma.business.update({
      where: {
        id: business.id,
      },
      data: {
        name: parsed.data.name,
        logoUrl: finalLogoUrl,
        coverImageUrl: parsed.data.coverImageUrl || null,
        primaryColor: parsed.data.primaryColor,
        secondaryColor: parsed.data.secondaryColor,
        currency: optionalProfileValue(parsed.data.currency),
        timezone: optionalProfileValue(parsed.data.timezone),
        loyaltyProgramName: parsed.data.loyaltyProgramName || null,
        pointsName: parsed.data.pointsName || null,
        membershipName: parsed.data.membershipName || null,
        welcomeMessage: parsed.data.welcomeMessage || null,
        cardDefaultLanguage: parsed.data.cardDefaultLanguage,
        staffAttributionEnabled: parsed.data.staffAttributionMode !== "OFF",
        staffAttributionRequired:
          parsed.data.staffAttributionMode === "REQUIRED",
        loyaltyMode: parsed.data.loyaltyMode,
        unitName: parsed.data.unitName,
        rewardName: parsed.data.rewardName,
        rewardType: parsed.data.rewardType,
        rewardCode: parsed.data.rewardCode || null,
        rewardDescription: parsed.data.rewardDescription || null,
        rewardThreshold: parsed.data.rewardThreshold,
        earnAmount: parsed.data.earnAmount,
        whatsappWelcomeMessage: parsed.data.whatsappWelcomeMessage,
        whatsappBalanceMessage: parsed.data.whatsappBalanceMessage,
        whatsappRewardMessage: parsed.data.whatsappRewardMessage,
      },
    }),

    prisma.businessActivity.create({
      data: {
        type: "BUSINESS_SETTINGS_UPDATED",
        description: "تم تحديث إعدادات النشاط",
        businessId: business.id,
        createdById: session.user.id,
      },
    }),
  ]);

  await syncBusinessToGoogleSheetSafely(business.id);

  revalidatePath("/dashboard");
  revalidatePath("/businesses");
  revalidatePath(`/businesses/${business.slug}`);
  revalidatePath(`/businesses/${business.slug}/customers`);
  revalidatePath(`/businesses/${business.slug}/settings`);
  revalidatePath(`/businesses/${business.slug}/activity`);

  revalidatePath("/card/[token]", "page");

  redirect(`/businesses/${business.slug}/settings?saved=1`);
}

export async function syncGoogleSheetAction(slug: string) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!business) {
    redirect("/businesses");
  }

  const canManage = canManageBusiness(session.user, business.id);

  if (!canManage) {
    redirect("/dashboard");
  }

  const result = await syncBusinessToGoogleSheetSafely(business.id);

  revalidatePath(`/businesses/${business.slug}/settings`);

  redirect(
    `/businesses/${business.slug}/settings?sheetSync=${
      result ? "success" : "error"
    }`,
  );
}

export async function updateBusinessCardDetailsAction(
  slug: string,
  formData: FormData,
) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!business) {
    redirect("/businesses");
  }

  const canManage = canManageBusiness(session.user, business.id);

  if (!canManage) {
    redirect("/dashboard");
  }

  const parsed = cardBusinessDetailsSchema.safeParse({
    contactPhone: formData.get("contactPhone"),
    address: formData.get("address"),
    cardTerms: formData.get("cardTerms"),
  });

  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/settings?cardError=invalid`);
  }

  await prisma.$transaction([
    prisma.business.update({
      where: {
        id: business.id,
      },
      data: {
        contactPhone: parsed.data.contactPhone,
        address: parsed.data.address,
        cardTerms: parsed.data.cardTerms,
      },
    }),

    prisma.businessActivity.create({
      data: {
        type: "BUSINESS_SETTINGS_UPDATED",
        description: "تم تحديث بيانات التواصل وشروط الكارت الرقمي",
        businessId: business.id,
        createdById: session.user.id,
      },
    }),
  ]);

  revalidatePath(`/businesses/${business.slug}/settings`);

  revalidatePath("/card/[token]", "page");

  redirect(`/businesses/${business.slug}/settings?cardSaved=1`);
}

export async function updateBusinessExportPermissionAction(
  slug: string,
  formData: FormData,
) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },

    select: {
      id: true,
      slug: true,
    },
  });

  if (!business) {
    redirect("/businesses");
  }

  const allowOwnerDataExport = formData.get("allowOwnerDataExport") === "on";

  await prisma.$transaction([
    prisma.business.update({
      where: {
        id: business.id,
      },

      data: {
        allowOwnerDataExport,
      },
    }),

    prisma.businessActivity.create({
      data: {
        type: "BUSINESS_SETTINGS_UPDATED",

        description: allowOwnerDataExport
          ? "تم السماح لمالك النشاط بتصدير البيانات"
          : "تم إيقاف صلاحية تصدير البيانات عن مالك النشاط",

        businessId: business.id,

        createdById: session.user.id,
      },
    }),
  ]);

  revalidatePath(`/businesses/${business.slug}`);

  revalidatePath(`/businesses/${business.slug}/customers`);

  revalidatePath(`/businesses/${business.slug}/reports`);

  revalidatePath(`/businesses/${business.slug}/settings`);

  revalidatePath(`/businesses/${business.slug}/activity`);

  redirect(`/businesses/${business.slug}/settings?exportPermissionSaved=1`);
}
