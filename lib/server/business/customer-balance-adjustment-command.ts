import type { Prisma } from "@/generated/prisma/client";
import type { ActivityRequestContext } from "@/lib/activity/request-context";
import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import { recordBalanceAdjustment } from "@/lib/loyalty/transactions";
import prisma from "@/lib/prisma";
import { enqueueCustomerMessageJob } from "@/lib/server/integrations/customer-messaging";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";

export type CustomerBalanceAdjustmentCommandResult = Readonly<{
  balance: number | null;
  integrationJobId: string | null;
  integrationJobIds: readonly string[];
  rewardReady: boolean;
}>;

async function getNewlyReadyReward(
  transaction: Prisma.TransactionClient,
  input: {
    businessId: string;
    balanceBefore: number;
    balanceAfter: number;
  },
) {
  if (input.balanceAfter <= input.balanceBefore) return null;

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
 * Authoritative customer balance-adjustment transaction boundary.
 *
 * Authentication, capability checks, input parsing, request-context capture,
 * presentation redirects, revalidation and post-commit transport wake-up stay
 * in the Server Action. This command atomically combines the canonical guarded
 * financial mutation with durable integration jobs.
 */
export async function adjustCustomerBalanceCommand(input: {
  businessId: string;
  customerId: string;
  actor: FinancialOperationActor;
  branchId?: string;
  attributedStaffId?: string;
  activityContext?: ActivityRequestContext;
  direction: "ADD" | "SUBTRACT";
  amount: number;
  reason: string;
  idempotencyKey: string;
}): Promise<CustomerBalanceAdjustmentCommandResult> {
  return prisma.$transaction(async (transaction) => {
    const balance = await recordBalanceAdjustment(transaction, {
      customerId: input.customerId,
      businessId: input.businessId,
      actor: input.actor,
      branchId: input.branchId,
      attributedStaffId: input.attributedStaffId,
      activityContext: input.activityContext,
      direction: input.direction,
      amount: input.amount,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    });

    if (balance === null) {
      return {
        balance: null,
        integrationJobId: null,
        integrationJobIds: [],
        rewardReady: false,
      };
    }

    const balanceBefore =
      input.direction === "ADD" ? balance - input.amount : balance + input.amount;
    const newlyReadyReward = await getNewlyReadyReward(transaction, {
      businessId: input.businessId,
      balanceBefore,
      balanceAfter: balance,
    });

    const sheetsJob = await enqueueIntegrationJob(transaction, {
      businessId: input.businessId,
      kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
      idempotencyKey: `customer-balance-adjustment:${input.idempotencyKey}`,
    });
    const balanceJob = await enqueueCustomerMessageJob(transaction, {
      businessId: input.businessId,
      customerId: input.customerId,
      event: "BALANCE_UPDATED",
      eventKey: `adjustment:${input.idempotencyKey}`,
      balance,
    });
    const rewardJob = newlyReadyReward
      ? await enqueueCustomerMessageJob(transaction, {
          businessId: input.businessId,
          customerId: input.customerId,
          event: "REWARD_READY",
          eventKey: `adjustment:${input.idempotencyKey}:${newlyReadyReward.id}`,
          balance,
          rewardName: newlyReadyReward.name,
        })
      : null;
    const integrationJobIds = [sheetsJob.id, balanceJob?.id, rewardJob?.id].filter(
      (jobId): jobId is string => Boolean(jobId),
    );

    return {
      balance,
      integrationJobId: sheetsJob.id,
      integrationJobIds,
      rewardReady: Boolean(newlyReadyReward),
    };
  });
}
