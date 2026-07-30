"use server";

import { auth } from "@/auth";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import {
  imageFileToDataUrl,
  isValidRemoteImageUrl,
} from "@/lib/branding/image-data";
import {
  isValidBusinessPhone,
} from "@/lib/business-profile";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthorizedCardDesignUpdate } from "@/lib/cards/card-design-permissions";
import {
  businessProfileSettingsSchema,
  customerMessagesSettingsSchema,
  getBusinessProfileUpdate,
  getCustomerMessagesUpdate,
  getOperationsSettingsUpdate,
  getProgramRulesUpdate,
  operationsSettingsSchema,
  programRulesSettingsSchema,
} from "@/lib/business/settings-domains";

const cardBusinessDetailsSchema = z.object({
  contactPhone: z.string().trim().refine(isValidBusinessPhone),

  address: z.string().trim().min(5).max(250),

  cardTerms: z.string().trim().min(5).max(1200),
});

const cardDesignSchema = z.object({
  logoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || isValidRemoteImageUrl(value)),
  cardDesignMode: z.enum(["STANDARD", "CUSTOM"]),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  themePreset: z.enum(["DEFAULT", "DARK"]),
  standardCardArtworkEnabled: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
  standardCardArtworkCategory: z.enum([
    "BARBER",
    "CAFE",
    "RESTAURANT",
    "FASHION",
    "BEAUTY",
    "GYM",
    "RETAIL",
    "OTHER",
  ]),
  customCardArtworkEnabled: z.preprocess(
    (value) => value === "true" || value === true,
    z.boolean(),
  ),
  customCardFrontArtworkUrl: z.string().trim().max(500).refine((value) => value === "" || isValidRemoteImageUrl(value)),
  customCardBackArtworkUrl: z.string().trim().max(500).refine((value) => value === "" || isValidRemoteImageUrl(value)),
  customCardSafeZoneVersion: z.literal("ID1_V1"),
}).superRefine((value, context) => {
  if (
    value.cardDesignMode === "CUSTOM" &&
    (!value.customCardArtworkEnabled || !value.customCardFrontArtworkUrl || !value.customCardBackArtworkUrl)
  ) {
    context.addIssue({
      code: "custom",
      path: ["cardDesignMode"],
      message: "Custom Card requires approved front and back artwork.",
    });
  }
});

async function getManagedBusiness(slug: string) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      coverImageUrl: true,
    },
  });
  if (!business) {
    redirect("/businesses");
  }
  if (!canManageBusiness(session.user, business.id)) {
    redirect("/dashboard");
  }
  return { business, session };
}

async function updateSettingsDomain(input: {
  businessId: string;
  slug: string;
  user: Parameters<typeof activityActorFields>[0];
  description: string;
  data: Parameters<typeof prisma.business.update>[0]["data"];
  syncSheet?: boolean;
}) {
  const activityContext = await getActivityRequestContext();
  await prisma.$transaction([
    prisma.business.update({
      where: { id: input.businessId },
      data: input.data,
    }),
    prisma.businessActivity.create({
      data: {
        type: "BUSINESS_SETTINGS_UPDATED",
        description: input.description,
        businessId: input.businessId,
        ...activityActorFields(input.user, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
    }),
  ]);
  if (input.syncSheet) {
    await syncBusinessToGoogleSheetSafely(input.businessId);
  }
  revalidatePath("/dashboard");
  revalidatePath("/businesses");
  revalidatePath(`/businesses/${input.slug}`);
  revalidatePath(`/businesses/${input.slug}/customers`);
  revalidatePath(`/businesses/${input.slug}/settings`);
  revalidatePath(`/businesses/${input.slug}/activity`);
  revalidatePath("/card/[token]", "page");
}

export async function updateBusinessProfileAction(
  slug: string,
  formData: FormData,
) {
  const { business, session } = await getManagedBusiness(slug);
  const removeCoverImage = formData.get("removeCoverImage") === "on";
  const coverImageFile = formData.get("coverImageFile");
  let uploadedCoverImageDataUrl: string | null = null;
  if (coverImageFile instanceof File && coverImageFile.size > 0) {
    uploadedCoverImageDataUrl = await imageFileToDataUrl(
      coverImageFile,
      1024 * 1024,
    );
    if (!uploadedCoverImageDataUrl) {
      redirect(`/businesses/${business.slug}/settings?profile=invalid`);
    }
  }
  const parsed = businessProfileSettingsSchema.safeParse({
    name: formData.get("name"),
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    currency: formData.get("currency") ?? "",
    timezone: formData.get("timezone") ?? "",
    industry: formData.get("industry") ?? "",
    website: formData.get("website") ?? "",
    email: formData.get("email") ?? "",
    country: formData.get("country") ?? "",
    city: formData.get("city") ?? "",
    taxNumber: formData.get("taxNumber") ?? "",
    employeeCount: formData.get("employeeCount") ?? 0,
    description: formData.get("description") ?? "",
    instagramUrl: formData.get("instagramUrl") ?? "",
  });
  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/settings?profile=invalid`);
  }
  const submittedCoverImageUrl = parsed.data.coverImageUrl || null;
  const finalCoverImageUrl = removeCoverImage
    ? null
    : uploadedCoverImageDataUrl ??
      submittedCoverImageUrl ??
      business.coverImageUrl;
  await updateSettingsDomain({
    businessId: business.id,
    slug: business.slug,
    user: session.user,
    description: "تم تحديث الملف التعريفي للنشاط",
    data: getBusinessProfileUpdate(parsed.data, finalCoverImageUrl),
    syncSheet: true,
  });
  redirect(`/businesses/${business.slug}/settings?profile=saved`);
}

export async function updateProgramRulesAction(
  slug: string,
  formData: FormData,
) {
  const { business, session } = await getManagedBusiness(slug);
  const parsed = programRulesSettingsSchema.safeParse({
    loyaltyProgramName: formData.get("loyaltyProgramName") ?? "",
    pointsName: formData.get("pointsName") ?? "",
    welcomeMessage: formData.get("welcomeMessage") ?? "",
    cardDefaultLanguage: formData.get("cardDefaultLanguage"),
    loyaltyMode: formData.get("loyaltyMode"),
    unitName: formData.get("unitName"),
    rewardName: formData.get("rewardName"),
    rewardType: formData.get("rewardType"),
    rewardCode: formData.get("rewardCode") ?? "",
    rewardDescription: formData.get("rewardDescription") ?? "",
    rewardThreshold: formData.get("rewardThreshold"),
    earnAmount: formData.get("earnAmount"),
  });
  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/settings?program=invalid`);
  }
  await updateSettingsDomain({
    businessId: business.id,
    slug: business.slug,
    user: session.user,
    description: "تم تحديث قواعد برنامج الولاء",
    data: getProgramRulesUpdate(parsed.data),
    syncSheet: true,
  });
  redirect(`/businesses/${business.slug}/settings?program=saved`);
}

export async function updateCustomerMessagesAction(
  slug: string,
  formData: FormData,
) {
  const { business, session } = await getManagedBusiness(slug);
  const parsed = customerMessagesSettingsSchema.safeParse({
    whatsappWelcomeMessage: formData.get("whatsappWelcomeMessage"),
    whatsappBalanceMessage: formData.get("whatsappBalanceMessage"),
    whatsappRewardMessage: formData.get("whatsappRewardMessage"),
  });
  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/settings?messages=invalid`);
  }
  await updateSettingsDomain({
    businessId: business.id,
    slug: business.slug,
    user: session.user,
    description: "تم تحديث قوالب رسائل العملاء",
    data: getCustomerMessagesUpdate(parsed.data),
  });
  redirect(`/businesses/${business.slug}/settings?messages=saved`);
}

export async function updateOperationsSettingsAction(
  slug: string,
  formData: FormData,
) {
  const { business, session } = await getManagedBusiness(slug);
  const parsed = operationsSettingsSchema.safeParse({
    staffAttributionMode: formData.get("staffAttributionMode"),
  });
  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/settings?operations=invalid`);
  }
  await updateSettingsDomain({
    businessId: business.id,
    slug: business.slug,
    user: session.user,
    description: "تم تحديث إعدادات التشغيل",
    data: getOperationsSettingsUpdate(parsed.data),
  });
  redirect(`/businesses/${business.slug}/settings?operations=saved`);
}

export async function updateBusinessCardDesignAction(
  slug: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true, logoUrl: true, cardDesignMode: true },
  });
  if (!business) redirect("/businesses");
  if (!canManageBusiness(session.user, business.id)) redirect("/dashboard");

  const logoFile = formData.get("logoFile");
  let uploadedLogoDataUrl: string | null = null;
  if (logoFile instanceof File && logoFile.size > 0) {
    uploadedLogoDataUrl = await imageFileToDataUrl(logoFile, 500 * 1024);
    if (!uploadedLogoDataUrl)
      redirect(`/businesses/${slug}/settings?cardDesign=invalid`);
  }

  const parsed = cardDesignSchema.safeParse({
    logoUrl: formData.get("logoUrl") ?? "",
    cardDesignMode: formData.get("cardDesignMode") ?? "STANDARD",
    primaryColor: formData.get("primaryColor"),
    themePreset: formData.get("themePreset") ?? "DEFAULT",
    standardCardArtworkEnabled: formData.get("standardCardArtworkEnabled") ?? false,
    standardCardArtworkCategory: formData.get("standardCardArtworkCategory") ?? "OTHER",
    customCardArtworkEnabled: formData.get("customCardArtworkEnabled") ?? false,
    customCardFrontArtworkUrl: formData.get("customCardFrontArtworkUrl") ?? "",
    customCardBackArtworkUrl: formData.get("customCardBackArtworkUrl") ?? "",
    customCardSafeZoneVersion: formData.get("customCardSafeZoneVersion") ?? "ID1_V1",
  });

  if (!parsed.success) redirect(`/businesses/${slug}/settings?cardDesign=invalid`);
  const authorizedUpdate = getAuthorizedCardDesignUpdate({
    role: session.user.role,
    currentDesignMode: business.cardDesignMode,
    submitted: parsed.data,
  });
  if (!authorizedUpdate.allowed) {
    redirect(
      `/businesses/${slug}/settings?cardDesign=${
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

  const activityContext = await getActivityRequestContext();
  await prisma.$transaction([
    prisma.business.update({
      where: { id: business.id },
      data: { ...authorizedUpdate.data, logoUrl: finalLogoUrl },
    }),
    prisma.businessActivity.create({
      data: {
        type: "BUSINESS_SETTINGS_UPDATED",
        description: "تم تحديث تصميم بطاقة الولاء",
        businessId: business.id,
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
      },
    }),
  ]);

  revalidatePath(`/businesses/${business.slug}/settings`);
  revalidatePath("/card/[token]", "page");
  redirect(`/businesses/${business.slug}/settings?cardDesign=saved`);
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
      result.status === "success" ? "success" : "error"
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

  const activityContext = await getActivityRequestContext();

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
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
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
  const activityContext = await getActivityRequestContext();

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

        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
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
