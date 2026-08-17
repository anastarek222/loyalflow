import type { ActivityRequestContext } from "@/lib/activity/request-context";
import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import { recordBalanceAdjustment } from "@/lib/loyalty/transactions";
import prisma from "@/lib/prisma";

/**
 * Authoritative customer balance-adjustment transaction boundary.
 *
 * Authentication, capability checks, input parsing, request-context capture,
 * presentation redirects, revalidation and post-commit Google Sheets sync stay
 * in the Server Action. This command owns the transaction that delegates the
 * guarded/idempotent financial mutation to the canonical loyalty transaction
 * implementation.
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
}) {
  return prisma.$transaction((transaction) =>
    recordBalanceAdjustment(transaction, {
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
    }),
  );
}
