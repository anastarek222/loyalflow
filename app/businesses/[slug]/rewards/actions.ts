"use server";

import { auth } from "@/auth";
import { hasFeatureEntitlement, isWithinPlanLimit } from "@/lib/entitlements";
import { getEffectivePlanLimits } from "@/lib/entitlements-server";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  normalizeRewardInput,
  rewardInputSchema,
} from "@/lib/rewards/catalog";
import {
  createRewardCommand,
  setRewardStatusCommand,
  updateRewardCommand,
  type RewardWriteCommandResult,
} from "@/lib/server/business/reward-write-command";
import { actionBooleanSchema, opaqueIdSchema } from "@/lib/validation/action-input";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getRewardManagementContext(slug: string) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      plan: true,
      subscriptionLifecycleState: true,
    },
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

function rewardCommandError(result: RewardWriteCommandResult) {
  if (result.ok) return null;
  switch (result.reason) {
    case "SUBSCRIPTION_RESTRICTED":
      return "subscription-restricted";
    case "PLAN_FEATURE":
      return "plan-feature";
    case "PLAN_LIMIT":
      return "plan-limit";
    case "BUSINESS_NOT_FOUND":
    case "TARGET_NOT_FOUND":
      return "not-found";
  }
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
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "EXPAND",
    )
  ) {
    redirect(`/businesses/${business.slug}/rewards?error=subscription-restricted`);
  }
  if (!hasFeatureEntitlement(business.plan, "REWARDS")) {
    redirect(`/businesses/${business.slug}/rewards?error=plan-feature`);
  }
  const [rewardCount, planLimits] = await Promise.all([
    prisma.reward.count({ where: { businessId: business.id } }),
    getEffectivePlanLimits(business.plan),
  ]);
  if (!isWithinPlanLimit(business.plan, "REWARDS", rewardCount, 1, planLimits)) {
    redirect(`/businesses/${business.slug}/rewards?error=plan-limit`);
  }

  const result = await createRewardCommand({
    businessId: business.id,
    reward: normalizeRewardInput(parsed.data),
    actor: session.user,
  });
  const error = rewardCommandError(result);
  if (error) {
    redirect(`/businesses/${business.slug}/rewards?error=${error}`);
  }

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
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${business.slug}/rewards?error=subscription-restricted`);
  }

  const existingReward = await prisma.reward.findFirst({
    where: { id: parsedRewardId.data, businessId: business.id },
    select: { id: true },
  });
  if (!existingReward) {
    redirect(`/businesses/${business.slug}/rewards?error=not-found`);
  }

  const result = await updateRewardCommand({
    businessId: business.id,
    rewardId: existingReward.id,
    reward: normalizeRewardInput(parsed.data),
    actor: session.user,
  });
  const error = rewardCommandError(result);
  if (error) {
    redirect(`/businesses/${business.slug}/rewards?error=${error}`);
  }

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
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${business.slug}/rewards?error=subscription-restricted`);
  }

  const existingReward = await prisma.reward.findFirst({
    where: { id: parsedRewardId.data, businessId: business.id },
    select: { id: true },
  });
  if (!existingReward) {
    redirect(`/businesses/${business.slug}/rewards?error=not-found`);
  }

  const result = await setRewardStatusCommand({
    businessId: business.id,
    rewardId: existingReward.id,
    isActive: parsedStatus.data,
    actor: session.user,
  });
  const error = rewardCommandError(result);
  if (error) {
    redirect(`/businesses/${business.slug}/rewards?error=${error}`);
  }

  revalidateRewardPaths(business.slug);
  redirect(`/businesses/${business.slug}/rewards?success=updated`);
}
