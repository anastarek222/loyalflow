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
  loyaltyMode: z.enum(["VISITS", "POINTS", "SALES_AMOUNT"]),
  unitName: z.string().trim().min(1).max(30),
  rewardName: z.string().trim().min(2).max(100),
  rewardThreshold: z.coerce.number().int().min(1).max(1000000),
  earnAmount: z.coerce.number().int().min(1).max(1000000),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
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
    loyaltyMode: formData.get("loyaltyMode"),
    unitName: formData.get("unitName"),
    rewardName: formData.get("rewardName"),
    rewardThreshold: formData.get("rewardThreshold"),
    earnAmount: formData.get("earnAmount"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
  });

  if (!parsed.success) {
    redirect("/businesses?error=invalid");
  }

  let createdBusiness;

  try {
    createdBusiness = await createWithGeneratedSlug(
      parsed.data.name,
      (slug) =>
        prisma.business.create({
          data: {
            name: parsed.data.name,
            slug,
            contactPhone:
              optionalProfileValue(parsed.data.contactPhone),
            currency:
              optionalProfileValue(parsed.data.currency),
            timezone:
              optionalProfileValue(parsed.data.timezone),
            loyaltyMode: parsed.data.loyaltyMode,
            unitName: parsed.data.unitName,
            rewardName: parsed.data.rewardName,
            rewardThreshold: parsed.data.rewardThreshold,
            earnAmount: parsed.data.earnAmount,
            primaryColor: parsed.data.primaryColor,
            secondaryColor: parsed.data.secondaryColor,
          },
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

  redirect("/businesses?created=1");
}
