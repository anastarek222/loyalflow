import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import type { ActivityRequestContext } from "@/lib/activity/request-context";
import {
  isFinancialOperationAbortedError,
  recordRewardRedemption,
} from "@/lib/loyalty/transactions";
import { getRewardUnlockRedemptionState } from "@/lib/rewards/expiration";
import prisma from "@/lib/prisma";
import { enqueueCustomerMessageJob } from "@/lib/server/integrations/customer-messaging";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";

export type LoyaltyRedemptionCommandResult =
  | Readonly<{
      ok: true;
      balance: number;
      integrationJobId: string;
      integrationJobIds: readonly string[];
    }>
  | Readonly<{ ok: false; reason: "REWARD_EXPIRED" | "INSUFFICIENT_BALANCE" }>;

/**
 * Authoritative loyalty redemption transaction boundary.
 *
 * Authentication, capability checks, reward selection, replay validation,
 * rapid-operation protection, presentation redirects, post-commit transport
 * wake-up and page revalidation remain in the bounded action. This command
 * preserves reward-unlock expiry semantics and atomically commits the canonical
 * redemption plus durable integration jobs.
 */
export async function redeemLoyaltyRewardCommand(input: {
  businessId: string;
  customerId: string;
  actor: FinancialOperationActor;
  branchId?: string;
  attributedStaffId?: string;
  activityContext?: ActivityRequestContext;
  cost: number;
  rewardLabel: string;
  rewardName: string;
  rewardId?: string;
  rewardExpiresAfterDays?: number | null;
  idempotencyKey: string;
  reportContextFailure: boolean;
}): Promise<LoyaltyRedemptionCommandResult> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const now = new Date();
      let unlockId: string | null = null;

      if (input.rewardId && input.rewardExpiresAfterDays) {
        const unlock = await transaction.rewardUnlock.findFirst({
          where: {
            businessId: input.businessId,
            customerId: input.customerId,
            rewardId: input.rewardId,
            redeemedAt: null,
          },
          orderBy: { unlockedAt: "desc" },
        });

        if (unlock) {
          const unlockState = getRewardUnlockRedemptionState({
            expectedBusinessId: input.businessId,
            unlockBusinessId: unlock.businessId,
            rewardBusinessId: input.businessId,
            expiresAt: unlock.expiresAt,
            redeemedAt: unlock.redeemedAt,
            expiredAt: unlock.expiredAt,
            now,
          });

          if (unlockState !== "ACTIVE") {
            if (!unlock.expiredAt) {
              await transaction.rewardUnlock.updateMany({
                where: {
                  id: unlock.id,
                  businessId: input.businessId,
                  customerId: input.customerId,
                  rewardId: input.rewardId,
                  redeemedAt: null,
                  expiredAt: null,
                  expiresAt: { lte: now },
                },
                data: { expiredAt: now },
              });
              await transaction.businessActivity.create({
                data: {
                  type: "REWARD_EXPIRED",
                  description: `انتهت صلاحية ${input.rewardName}`,
                  businessId: input.businessId,
                  customerId: input.customerId,
                  createdById: input.actor.id,
                },
              });
            }

            await transaction.businessActivity.create({
              data: {
                type: "REWARD_REDEMPTION_BLOCKED",
                description: `تم رفض استبدال ${input.rewardName} لانتهاء الصلاحية`,
                businessId: input.businessId,
                customerId: input.customerId,
                createdById: input.actor.id,
              },
            });
            return { ok: false, reason: "REWARD_EXPIRED" } as const;
          }

          unlockId = unlock.id;
        }
      }

      const balance = await recordRewardRedemption(transaction, {
        customerId: input.customerId,
        businessId: input.businessId,
        actor: input.actor,
        branchId: input.branchId,
        attributedStaffId: input.attributedStaffId,
        activityContext: input.activityContext,
        cost: input.cost,
        rewardLabel: input.rewardLabel,
        rewardName: input.rewardName,
        rewardId: input.rewardId,
        ...(unlockId ? { unlockId } : {}),
        idempotencyKey: input.idempotencyKey,
        reportContextFailure: input.reportContextFailure,
      });

      if (balance === null) {
        return { ok: false, reason: "INSUFFICIENT_BALANCE" } as const;
      }

      const sheetsJob = await enqueueIntegrationJob(transaction, {
        businessId: input.businessId,
        kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
        idempotencyKey: `loyalty-redemption:${input.idempotencyKey}`,
      });
      const redeemedJob = await enqueueCustomerMessageJob(transaction, {
        businessId: input.businessId,
        customerId: input.customerId,
        event: "REWARD_REDEEMED",
        eventKey: input.idempotencyKey,
        balance,
        rewardName: input.rewardName,
      });
      const integrationJobIds = [sheetsJob.id, redeemedJob?.id].filter(
        (jobId): jobId is string => Boolean(jobId),
      );

      return {
        ok: true,
        balance,
        integrationJobId: sheetsJob.id,
        integrationJobIds,
      } as const;
    });
  } catch (error) {
    if (isFinancialOperationAbortedError(error)) {
      return { ok: false, reason: "INSUFFICIENT_BALANCE" } as const;
    }
    throw error;
  }
}
