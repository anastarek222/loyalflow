import type { Prisma } from "@/generated/prisma/client";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import { hasFeatureEntitlement, isWithinPlanLimit } from "@/lib/entitlements";
import { configurationToPlanLimits } from "@/lib/entitlements-server";
import prisma from "@/lib/prisma";
import { lockBusinessCapacity } from "@/lib/server/business/business-capacity-lock";
import { normalizeRewardInput } from "@/lib/rewards/catalog";

export type RewardWriteActor = Readonly<{
  id: string;
  businessId: string | null;
  email?: string | null;
}>;

export type NormalizedRewardInput = ReturnType<typeof normalizeRewardInput>;

type RewardWriteFailure = Readonly<{
  ok: false;
  reason:
    | "BUSINESS_NOT_FOUND"
    | "TARGET_NOT_FOUND"
    | "SUBSCRIPTION_RESTRICTED"
    | "PLAN_FEATURE"
    | "PLAN_LIMIT"
    | "ACTIVE_ENTITLEMENTS";
}>;

export type RewardWriteCommandResult = Readonly<{ ok: true }> | RewardWriteFailure;

async function hasLiveRewardEntitlements(
  transaction: Prisma.TransactionClient,
  businessId: string,
  rewardId: string,
) {
  return (
    (await transaction.rewardUnlock.count({
      where: {
        businessId,
        rewardId,
        redeemedAt: null,
        expiredAt: null,
        expiresAt: { gt: new Date() },
      },
    })) > 0
  );
}

/**
 * Authoritative non-financial Reward creation boundary.
 *
 * The caller keeps authentication, tenant authorization, input parsing,
 * presentation preflight, redirects and revalidation. This command owns the
 * persisted subscription/plan checks and the atomic Reward + audit write.
 */
export async function createRewardCommand(input: {
  businessId: string;
  reward: NormalizedRewardInput;
  actor: RewardWriteActor;
}): Promise<RewardWriteCommandResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    await lockBusinessCapacity(transaction, input.businessId);

    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "EXPAND",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const business = await transaction.business.findUnique({
      where: { id: input.businessId },
      select: { plan: true },
    });
    if (!business) {
      return { ok: false, reason: "BUSINESS_NOT_FOUND" } as const;
    }

    const [configuration, rewardCount] = await Promise.all([
      transaction.planConfiguration.findUnique({
        where: { plan: business.plan },
        select: {
          customerLimit: true,
          userLimit: true,
          branchLimit: true,
          offerLimit: true,
          rewardLimit: true,
        },
      }),
      transaction.reward.count({ where: { businessId: input.businessId } }),
    ]);
    const planLimits = configurationToPlanLimits(configuration, business.plan);

    if (!hasFeatureEntitlement(business.plan, "REWARDS")) {
      return { ok: false, reason: "PLAN_FEATURE" } as const;
    }
    if (
      !isWithinPlanLimit(
        business.plan,
        "REWARDS",
        rewardCount,
        1,
        planLimits,
      )
    ) {
      return { ok: false, reason: "PLAN_LIMIT" } as const;
    }

    const reward = await transaction.reward.create({
      data: { ...input.reward, businessId: input.businessId },
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "REWARD_CREATED",
        description: `تم إنشاء المكافأة ${reward.name}`,
        businessId: input.businessId,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
    });

    return { ok: true } as const;
  });
}

export async function updateRewardCommand(input: {
  businessId: string;
  rewardId: string;
  reward: NormalizedRewardInput;
  actor: RewardWriteActor;
}): Promise<RewardWriteCommandResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const existingReward = await transaction.reward.findFirst({
      where: { id: input.rewardId, businessId: input.businessId },
      select: {
        id: true,
        name: true,
        type: true,
        code: true,
        cost: true,
        expiresAfterDays: true,
      },
    });
    if (!existingReward) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    const changesEarnedEntitlement =
      existingReward.name !== input.reward.name ||
      existingReward.type !== input.reward.type ||
      existingReward.code !== input.reward.code ||
      existingReward.cost !== input.reward.cost ||
      existingReward.expiresAfterDays !== input.reward.expiresAfterDays;
    if (
      changesEarnedEntitlement &&
      (await hasLiveRewardEntitlements(
        transaction,
        input.businessId,
        existingReward.id,
      ))
    ) {
      return { ok: false, reason: "ACTIVE_ENTITLEMENTS" } as const;
    }

    const reward = await transaction.reward.update({
      where: { id: existingReward.id },
      data: input.reward,
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "REWARD_UPDATED",
        description: `تم تحديث المكافأة ${reward.name}`,
        businessId: input.businessId,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
    });

    return { ok: true } as const;
  });
}

export async function setRewardStatusCommand(input: {
  businessId: string;
  rewardId: string;
  isActive: boolean;
  actor: RewardWriteActor;
}): Promise<RewardWriteCommandResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const existingReward = await transaction.reward.findFirst({
      where: { id: input.rewardId, businessId: input.businessId },
      select: { id: true, isActive: true },
    });
    if (!existingReward) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    if (
      existingReward.isActive &&
      !input.isActive &&
      (await hasLiveRewardEntitlements(
        transaction,
        input.businessId,
        existingReward.id,
      ))
    ) {
      return { ok: false, reason: "ACTIVE_ENTITLEMENTS" } as const;
    }

    const reward = await transaction.reward.update({
      where: { id: existingReward.id },
      data: { isActive: input.isActive },
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "REWARD_STATUS_CHANGED",
        description: input.isActive
          ? `تم تفعيل المكافأة ${reward.name}`
          : `تم إيقاف المكافأة ${reward.name}`,
        businessId: input.businessId,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
    });

    return { ok: true } as const;
  });
}
