"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const businessSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
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
    slug: formData.get("slug"),
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

  const existingBusiness = await prisma.business.findUnique({
    where: {
      slug: parsed.data.slug,
    },
  });

  if (existingBusiness) {
    redirect("/businesses?error=slug");
  }

  const createdBusiness = await prisma.business.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      loyaltyMode: parsed.data.loyaltyMode,
      unitName: parsed.data.unitName,
      rewardName: parsed.data.rewardName,
      rewardThreshold: parsed.data.rewardThreshold,
      earnAmount: parsed.data.earnAmount,
      primaryColor: parsed.data.primaryColor,
      secondaryColor: parsed.data.secondaryColor,
    },
  });

  await syncBusinessToGoogleSheetSafely(createdBusiness.id);

  revalidatePath("/businesses");
  revalidatePath("/dashboard");

  redirect("/businesses?created=1");
}
