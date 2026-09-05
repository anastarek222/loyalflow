import type { LoyaltyMode, Prisma } from "@/generated/prisma/client";
import type { ActivityRequestContext } from "@/lib/activity/request-context";
import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import { recordLoyaltyEarn } from "@/lib/loyalty/transactions";
import { createBusinessNotification } from "@/lib/notifications";
import {
  calculatePromotionBonus,
  selectEligiblePromotion,
} from "@/lib/promotions/engine";
import {
  getRewardExpiryDate,
  getRewardUnlockRedemptionState,
} from "@/lib/rewards/expiration";
import prisma from "@/lib/prisma";
import { enqueueCustomerMessageJob } from "@/lib/server/integrations/customer-messaging";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";

export type LoyaltyEarnCommandResult = Readonly<{
  balance: number | null;
  integrationJobId: string | null;
  integrationJobIds: readonly string[];
  rewardReady: boolean;
}>;

async function createRewardUnlocksForEarn(
  transaction: Prisma.TransactionClient,
  input: {
    businessId: string;
    customerId: string;
    createdById: string;
    balanceAfter: number;
  },
) {
  const now = new Date();
  const expiringRewards = await transaction.reward.findMany({
    where: {
      businessId: input.businessId,
      isActive: true,
      expiresAfterDays: { not: null },
      cost: { lte: input.balanceAfter },
    },
    select: {
      id: true,
      name: true,
      expiresAfterDays: true,
    },
  });

  for (const reward of expiringRewards) {
    const currentUnlock = await transaction.rewardUnlock.findFirst({
      where: {
        businessId: input.businessId,
        customerId: input.customerId,
        rewardId: reward.id,
        redeemedAt: null,
      },
      orderBy: { unlockedAt: "desc" },
      select: { id: true },
    });

    if (reward.expiresAfterDays === null) continue;

    if (currentUnlock) {
      const unlock = await transaction.rewardUnlock.findFirstOrThrow({
        where: {
          id: currentUnlock.id,
          businessId: input.businessId,
          customerId: input.customerId,
          rewardId: reward.id,
        },
      });
      const unlockState = getRewardUnlockRedemptionState({
        expectedBusinessId: input.businessId,
        unlockBusinessId: unlock.businessId,
        rewardBusinessId: input.businessId,
        expiresAt: unlock.expiresAt,
        redeemedAt: unlock.redeemedAt,
        expiredAt: unlock.expiredAt,
        now,
      });

      if (unlockState === "ACTIVE") continue;

      if (!unlock.expiredAt) {
        const expired = await transaction.rewardUnlock.updateMany({
          where: {
            id: unlock.id,
            businessId: input.businessId,
            customerId: input.customerId,
            rewardId: reward.id,
            redeemedAt: null,
            expiredAt: null,
            expiresAt: { lte: now },
          },
          data: { expiredAt: now },
        });
        if (expired.count === 1) {
          await transaction.businessActivity.create({
            data: {
              type: "REWARD_EXPIRED",
              description: `انتهت صلاحية ${reward.name}`,
              businessId: input.businessId,
              customerId: input.customerId,
              createdById: input.createdById,
            },
          });
        }
      }
    }

    const expiresAt = getRewardExpiryDate(now, reward.expiresAfterDays);
    try {
      await transaction.rewardUnlock.create({
        data: {
          businessId: input.businessId,
          customerId: input.customerId,
          rewardId: reward.id,
          unlockedAt: now,
          expiresAt,
        },
      });
    } catch (error) {
      if (!(
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2002"
      )) {
        throw error;
      }
      continue;
    }

    await transaction.businessActivity.create({
      data: {
        type: "REWARD_UNLOCKED",
        description: `تم فتح ${reward.name} حتى ${expiresAt.toISOString()}`,
        businessId: input.businessId,
        customerId: input.customerId,
        createdById: input.createdById,
      },
    });

    await createBusinessNotification(transaction, {
      type: "REWARD_UNLOCKED",
      title: "تم فتح مكافأة جديدة",
      message: `تم فتح ${reward.name} للعميل`,
      businessId: input.businessId,
    });
  }
}

async function getNewlyReadyReward(
  transaction: Prisma.TransactionClient,
  input: {
    businessId: string;
    balanceBefore: number;
    balanceAfter: number;
  },
) {
  const [business, rewards] = await Promise.all([
    transaction.business.findUnique({
      where: { id: input.businessId },
      select: { rewardThreshold: true, rewardName: true },
    }),
    transaction.reward.findMany({
      where: { businessId: input.businessId, isActive: true },
      select: { id: true, name: true, cost: true },
    }),
  ]);

  if (!business) return null;

  if (rewards.length > 0) {
    return (
      rewards
        .filter(
          (reward) =>
            input.balanceBefore < reward.cost && input.balanceAfter >= reward.cost,
        )
        .sort((left, right) => right.cost - left.cost || left.id.localeCompare(right.id))[0] ??
      null
    );
  }

  if (
    input.balanceBefore < business.rewardThreshold &&
    input.balanceAfter >= business.rewardThreshold
  ) {
    return {
      id: "fallback",
      name: business.rewardName,
      cost: business.rewardThreshold,
    };
  }

  return null;
}

/**
 * Authoritative Loyalty Earn transaction boundary.
 *
 * Presentation validation, rapid-operation protection, replay checks,
 * authentication, redirects and post-commit transport wake-up remain in the
 * Server Action. This command owns promotion selection/application, canonical
 * earn persistence, reward-unlock lifecycle updates and durable integration
 * jobs in the same transaction.
 */
export async function executeLoyaltyEarnCommand(input: {
  businessId: string;
  customerId: string;
  actor: FinancialOperationActor;
  branchId?: string;
  attributedStaffId?: string;
  activityContext?: ActivityRequestContext;
  amount: number;
  loyaltyMode: LoyaltyMode;
  unitName: string;
  saleAmount?: number;
  idempotencyKey: string;
  transactionNote: string;
  activityDescription: string;
  reportContextFailure: boolean;
}): Promise<LoyaltyEarnCommandResult> {
  return prisma.$transaction(async (transaction) => {
    const occurredAt = new Date();
    const promotions = await transaction.promotion.findMany({
      where: {
        businessId: input.businessId,
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: occurredAt } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: occurredAt } }] },
        ],
      },
      select: {
        id: true,
        businessId: true,
        isActive: true,
        loyaltyMode: true,
        minimumTransactionAmount: true,
        bonusAmount: true,
        bonusMultiplier: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    });

    const promotion = selectEligiblePromotion({
      businessId: input.businessId,
      loyaltyMode: input.loyaltyMode,
      transactionAmount: input.amount,
      occurredAt,
      promotions,
    });
    const promotionBonus = promotion
      ? calculatePromotionBonus(promotion, input.amount)
      : 0;

    const balanceAfter = await recordLoyaltyEarn(transaction, {
      customerId: input.customerId,
      businessId: input.businessId,
      actor: input.actor,
      branchId: input.branchId,
      activityContext: input.activityContext,
      attributedStaffId: input.attributedStaffId,
      amount: input.amount,
      sourceLoyaltyMode: input.loyaltyMode,
      unitName: input.unitName,
      saleAmount: input.saleAmount,
      idempotencyKey: input.idempotencyKey,
      promotion: promotion
        ? {
            id: promotion.id,
            businessId: promotion.businessId,
            bonusAmount: promotionBonus,
          }
        : undefined,
      transactionNote: input.transactionNote,
      activityDescription: input.activityDescription,
      reportContextFailure: input.reportContextFailure,
    });

    if (balanceAfter === null) {
      return {
        balance: null,
        integrationJobId: null,
        integrationJobIds: [],
        rewardReady: false,
      };
    }

    const balanceBefore = balanceAfter - input.amount - promotionBonus;
    const newlyReadyReward = await getNewlyReadyReward(transaction, {
      businessId: input.businessId,
      balanceBefore,
      balanceAfter,
    });

    await createRewardUnlocksForEarn(transaction, {
      businessId: input.businessId,
      customerId: input.customerId,
      createdById: input.actor.id,
      balanceAfter,
    });

    const sheetsJob = await enqueueIntegrationJob(transaction, {
      businessId: input.businessId,
      kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
      idempotencyKey: `loyalty-earn:${input.idempotencyKey}`,
    });
    const balanceJob = await enqueueCustomerMessageJob(transaction, {
      businessId: input.businessId,
      customerId: input.customerId,
      event: "BALANCE_UPDATED",
      eventKey: input.idempotencyKey,
      balance: balanceAfter,
    });
    const rewardJob = newlyReadyReward
      ? await enqueueCustomerMessageJob(transaction, {
          businessId: input.businessId,
          customerId: input.customerId,
          event: "REWARD_READY",
          eventKey: `${input.idempotencyKey}:${newlyReadyReward.id}`,
          balance: balanceAfter,
          rewardName: newlyReadyReward.name,
        })
      : null;
    const integrationJobIds = [sheetsJob.id, balanceJob?.id, rewardJob?.id].filter(
      (jobId): jobId is string => Boolean(jobId),
    );

    return {
      balance: balanceAfter,
      integrationJobId: sheetsJob.id,
      integrationJobIds,
      rewardReady: Boolean(newlyReadyReward),
    };
  });
}
