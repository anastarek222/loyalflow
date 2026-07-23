"use server";

import { auth } from "@/auth";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  normalizeRewardInput,
  rewardInputSchema,
} from "@/lib/rewards/catalog";
import { actionBooleanSchema, opaqueIdSchema } from "@/lib/validation/action-input";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getRewardManagementContext(slug: string) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });

  if (!business || !canManageBusiness(session.user, business.id)) {
    redirect("/dashboard");
  }

  return business;
}

function revalidateRewardPaths(slug: string) {
  revalidatePath(`/businesses/${slug}/rewards`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/businesses/${slug}/reports`);
}

export async function createRewardAction(
  slug: string,
  formData: FormData
) {
  const business = await getRewardManagementContext(slug);
  const parsed = rewardInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    code: formData.get("code") || undefined,
    cost: formData.get("cost"),
    expiresAfterDays:
      formData.get("expiresAfterDays") || undefined,
  });

  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/rewards?error=invalid`);
  }

  await prisma.reward.create({
    data: {
      ...normalizeRewardInput(parsed.data),
      businessId: business.id,
    },
  });

  revalidateRewardPaths(business.slug);
  redirect(`/businesses/${business.slug}/rewards?success=created`);
}

export async function updateRewardAction(
  slug: string,
  rewardId: string,
  formData: FormData
) {
  const business = await getRewardManagementContext(slug);
  const parsedRewardId = opaqueIdSchema.safeParse(rewardId);
  const parsed = rewardInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    code: formData.get("code") || undefined,
    cost: formData.get("cost"),
    expiresAfterDays:
      formData.get("expiresAfterDays") || undefined,
  });

  if (!parsed.success || !parsedRewardId.success) {
    redirect(`/businesses/${business.slug}/rewards?error=invalid`);
  }

  const result = await prisma.reward.updateMany({
    where: {
      id: parsedRewardId.data,
      businessId: business.id,
    },
    data: normalizeRewardInput(parsed.data),
  });

  if (result.count !== 1) {
    redirect(`/businesses/${business.slug}/rewards?error=not-found`);
  }

  revalidateRewardPaths(business.slug);
  redirect(`/businesses/${business.slug}/rewards?success=updated`);
}

export async function toggleRewardStatusAction(
  slug: string,
  rewardId: string,
  isActive: boolean
) {
  const business = await getRewardManagementContext(slug);
  const parsedRewardId = opaqueIdSchema.safeParse(rewardId);
  const parsedStatus = actionBooleanSchema.safeParse(isActive);

  if (!parsedRewardId.success || !parsedStatus.success) {
    redirect(`/businesses/${business.slug}/rewards?error=invalid`);
  }

  const result = await prisma.reward.updateMany({
    where: {
      id: parsedRewardId.data,
      businessId: business.id,
    },
    data: { isActive: parsedStatus.data },
  });

  if (result.count !== 1) {
    redirect(`/businesses/${business.slug}/rewards?error=not-found`);
  }

  revalidateRewardPaths(business.slug);
  redirect(`/businesses/${business.slug}/rewards?success=updated`);
}
