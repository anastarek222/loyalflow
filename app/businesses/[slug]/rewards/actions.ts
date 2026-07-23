"use server";

import { auth } from "@/auth";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
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

  return { business, session };
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
  const { business, session } = await getRewardManagementContext(slug);
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

  const activityContext = await getActivityRequestContext();
  await prisma.$transaction(async (transaction) => {
    const reward = await transaction.reward.create({
      data: {
        ...normalizeRewardInput(parsed.data),
        businessId: business.id,
      },
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "REWARD_CREATED",
        description: `تم إنشاء المكافأة ${reward.name}`,
        businessId: business.id,
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
      },
    });
  });

  revalidateRewardPaths(business.slug);
  redirect(`/businesses/${business.slug}/rewards?success=created`);
}

export async function updateRewardAction(
  slug: string,
  rewardId: string,
  formData: FormData
) {
  const { business, session } = await getRewardManagementContext(slug);
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

  const existingReward = await prisma.reward.findFirst({
    where: { id: parsedRewardId.data, businessId: business.id },
    select: { id: true },
  });
  if (!existingReward) {
    redirect(`/businesses/${business.slug}/rewards?error=not-found`);
  }

  const activityContext = await getActivityRequestContext();
  await prisma.$transaction(async (transaction) => {
    const reward = await transaction.reward.update({
      where: { id: existingReward.id },
      data: normalizeRewardInput(parsed.data),
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "REWARD_UPDATED",
        description: `تم تحديث المكافأة ${reward.name}`,
        businessId: business.id,
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
      },
    });
  });

  revalidateRewardPaths(business.slug);
  redirect(`/businesses/${business.slug}/rewards?success=updated`);
}

export async function toggleRewardStatusAction(
  slug: string,
  rewardId: string,
  isActive: boolean
) {
  const { business, session } = await getRewardManagementContext(slug);
  const parsedRewardId = opaqueIdSchema.safeParse(rewardId);
  const parsedStatus = actionBooleanSchema.safeParse(isActive);

  if (!parsedRewardId.success || !parsedStatus.success) {
    redirect(`/businesses/${business.slug}/rewards?error=invalid`);
  }

  const existingReward = await prisma.reward.findFirst({
    where: { id: parsedRewardId.data, businessId: business.id },
    select: { id: true },
  });
  if (!existingReward) {
    redirect(`/businesses/${business.slug}/rewards?error=not-found`);
  }

  const activityContext = await getActivityRequestContext();
  await prisma.$transaction(async (transaction) => {
    const reward = await transaction.reward.update({
      where: { id: existingReward.id },
      data: { isActive: parsedStatus.data },
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "REWARD_STATUS_CHANGED",
        description: parsedStatus.data
          ? `تم تفعيل المكافأة ${reward.name}`
          : `تم إيقاف المكافأة ${reward.name}`,
        businessId: business.id,
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
      },
    });
  });

  revalidateRewardPaths(business.slug);
  redirect(`/businesses/${business.slug}/rewards?success=updated`);
}
