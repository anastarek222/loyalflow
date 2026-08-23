import type { ActivityRequestContext } from "@/lib/activity/request-context";
import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import { recordBalanceAdjustment } from "@/lib/loyalty/transactions";
import prisma from "@/lib/prisma";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";

export type CustomerBalanceAdjustmentCommandResult = Readonly<{
  balance: number | null;
  integrationJobId: string | null;
}>;

/**
 * Authoritative customer balance-adjustment transaction boundary.
 *
 * Authentication, capability checks, input parsing, request-context capture,
 * presentation redirects, revalidation and post-commit transport wake-up stay
 * in the Server Action. This command atomically combines the canonical guarded
 * financial mutation with a durable Google Sheets integration job.
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
      return { balance: null, integrationJobId: null };
    }

    const integrationJob = await enqueueIntegrationJob(transaction, {
      businessId: input.businessId,
      kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
      idempotencyKey: `customer-balance-adjustment:${input.idempotencyKey}`,
    });

    return { balance, integrationJobId: integrationJob.id };
  });
}
