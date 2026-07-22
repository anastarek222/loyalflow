"use server";

import { auth } from "@/auth";
import {
  createWithGeneratedSlug,
  isSupportedCurrency,
  isValidIanaTimezone,
  isValidBusinessPhone,
  optionalProfileValue,
} from "@/lib/business-profile";
import prisma from "@/lib/prisma";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hash } from "bcryptjs";
	
const businessSchema = z.object({
  name: z.string().trim().min(2).max(80),
  contactPhone: z
    .string()
    .trim()
    .max(25)
    .refine((value) => value === "" || isValidBusinessPhone(value)),
  currency: z
    .string()
    .trim()
    .refine((value) => value === "" || isSupportedCurrency(value)),
  timezone: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidIanaTimezone(value)),
  

  industry: z.string().trim().max(100),

  website: z
   .string()
   .trim()
   .max(300)
   .refine((value) => {
     if (value === "") {
       return true;
     }

     try {
        const url = new URL(value);
        return (
          url.protocol === "http:" ||
          url.protocol === "https:"
        );
      } catch {
        return false;
      }
    }),

  email: z
    .string()
    .trim()
    .max(255)
    .email()
    .or(z.literal("")),

  country: z.string().trim().max(100),

  city: z.string().trim().max(100),

  taxNumber: z.string().trim().max(100),

  ownerFirstName: z.string().trim().min(2).max(80),
  ownerLastName: z.string().trim().max(80),

  ownerEmail: z
    .string()
    .trim()
    .max(255)
    .email(),

  ownerPassword: z
    .string()
    .min(8)
    .max(100),

  loyaltyMode: z.enum(["VISITS", "POINTS", "SALES_AMOUNT"]),
  unitName: z.string().trim().min(1).max(30),
  rewardName: z.string().trim().min(2).max(100),
  rewardThreshold: z.coerce.number().int().min(1).max(1000000),
  earnAmount: z.coerce.number().int().min(1).max(1000000),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),

  themePreset: z.enum([
    "DEFAULT",
    "MINIMAL",
    "LUXURY",
    "DARK",
    "MODERN",
    "GRADIENT",
  ]),

  cardStyle: z.enum([
    "CLASSIC",
    "COMPACT",
    "PREMIUM",
  ]),

  fontFamily: z.enum([
    "INTER",
    "CAIRO",
    "POPPINS",
  ]),
});

export async function createBusinessAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const parsed = businessSchema.safeParse({
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
   
    ownerFirstName: formData.get("ownerFirstName"),
    ownerLastName: formData.get("ownerLastName") ?? "",
    ownerEmail: formData.get("ownerEmail"),
    ownerPassword: formData.get("ownerPassword"),   

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
