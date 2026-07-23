"use server";

import { auth } from "@/auth";
import { imageFileToDataUrl } from "@/lib/branding/image-data";
import { businessCreationSchema } from "@/lib/business/creation-input";
import {
  createWithGeneratedSlug,
  optionalOwnerPhoneValue,
  optionalProfileValue,
} from "@/lib/business-profile";
import prisma from "@/lib/prisma";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";

export async function createBusinessAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const logoFile = formData.get("logoFile");
  let uploadedLogoDataUrl: string | null = null;

  if (logoFile instanceof File && logoFile.size > 0) {
    uploadedLogoDataUrl = await imageFileToDataUrl(logoFile, 500 * 1024);

    if (!uploadedLogoDataUrl) {
      redirect("/businesses?error=invalid");
    }
  }

  const parsed = businessCreationSchema.safeParse({
    name: formData.get("name"),
    contactPhone: formData.get("contactPhone") ?? "",
    currency: formData.get("currency") ?? "",
    timezone: formData.get("timezone") ?? "",

    industry: formData.get("industry") ?? "",
    website: formData.get("website") ?? "",
    email: formData.get("email") ?? "",
    country: formData.get("country") ?? "",
    city: formData.get("city") ?? "",
    taxNumber: formData.get("taxNumber") ?? "",

    employeeCount: formData.get("employeeCount") ?? 0,
   
    ownerFirstName: formData.get("ownerFirstName"),
    ownerLastName: formData.get("ownerLastName") ?? "",
    ownerEmail: formData.get("ownerEmail"),
    ownerPhone: formData.get("ownerPhone") ?? "",
    ownerPassword: formData.get("ownerPassword"),   
    logoUrl: formData.get("logoUrl") ?? "",

    loyaltyMode: formData.get("loyaltyMode"),
    unitName: formData.get("unitName"),
    rewardName: formData.get("rewardName"),
    rewardThreshold: formData.get("rewardThreshold"),
    earnAmount: formData.get("earnAmount"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),

    themePreset:
      formData.get("themePreset") ?? "DEFAULT",

    cardStyle:
      formData.get("cardStyle") ?? "CLASSIC",

    fontFamily:
      formData.get("fontFamily") ?? "INTER",
  });


if (!parsed.success) {
  redirect("/businesses?error=invalid");
}

const finalLogoUrl = uploadedLogoDataUrl ?? (parsed.data.logoUrl || null);

const ownerEmail = parsed.data.ownerEmail.toLowerCase();

const existingOwner = await prisma.user.findUnique({
  where: {
    email: ownerEmail,
  },
  select: {
    id: true,
  },
});

if (existingOwner) {
  redirect("/businesses?error=owner-email");
}

const ownerPasswordHash = await hash(
  parsed.data.ownerPassword,
  12
);

let createdBusiness;

try {
  createdBusiness = await createWithGeneratedSlug(
    parsed.data.name,
    (slug) =>
      prisma.$transaction(async (transaction) => {
        const business = await transaction.business.create({
          data: {
            name: parsed.data.name,
            slug,
            logoUrl: finalLogoUrl,
            contactPhone: optionalProfileValue(
              parsed.data.contactPhone
            ),
            currency: optionalProfileValue(
              parsed.data.currency
            ),
            timezone: optionalProfileValue(
              parsed.data.timezone
            ),
            industry: optionalProfileValue(
              parsed.data.industry
            ),
            website: optionalProfileValue(
              parsed.data.website
            ),
            email: optionalProfileValue(
              parsed.data.email
            ),
            country: optionalProfileValue(
              parsed.data.country
            ),
            city: optionalProfileValue(
              parsed.data.city
            ),
            taxNumber: optionalProfileValue(
              parsed.data.taxNumber
            ),

            employeeCount:
              parsed.data.employeeCount,

            loyaltyMode: parsed.data.loyaltyMode,
            unitName: parsed.data.unitName,
            rewardName: parsed.data.rewardName,
            rewardThreshold: parsed.data.rewardThreshold,
            earnAmount: parsed.data.earnAmount,
            primaryColor: parsed.data.primaryColor,
            secondaryColor: parsed.data.secondaryColor,

            themePreset:
              parsed.data.themePreset,

            cardStyle:
              parsed.data.cardStyle,

            fontFamily:
              parsed.data.fontFamily,
          },
        });

        await transaction.user.create({
          data: {
            firstName: parsed.data.ownerFirstName,
            lastName: parsed.data.ownerLastName || null,
            email: ownerEmail,
            phone: optionalOwnerPhoneValue(parsed.data.ownerPhone),
            passwordHash: ownerPasswordHash,
            role: "OWNER",
            businessId: business.id,
            isActive: true,
          },
        });

        return business;
      })
  );
} catch (error) {
  if (
    error instanceof Error &&
    error.message === "SAFE_SLUG_GENERATION_FAILED"
  ) {
    redirect("/businesses?error=slug-generation");
  }

  throw error;
}
  await syncBusinessToGoogleSheetSafely(createdBusiness.id);

  revalidatePath("/businesses");
  revalidatePath("/dashboard");

  redirect(`/businesses/${createdBusiness.slug}/users?created=business`);
}
