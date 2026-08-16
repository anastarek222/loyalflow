import { buildBranchAuditActivity } from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  getTenantScopedBranchWhere,
  normalizeBranchInput,
} from "@/lib/branches/management";
import prisma from "@/lib/prisma";

export type BranchCommandActor = Readonly<{
  id: string;
  businessId: string | null;
  email?: string | null;
}>;

export type BranchMaintenanceCommandResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false;
      reason: "BRANCH_NOT_FOUND" | "SUBSCRIPTION_RESTRICTED";
    }>;

export async function updateBranchCommand(input: {
  businessId: string;
  branchId: string;
  branch: ReturnType<typeof normalizeBranchInput>;
  actor: BranchCommandActor;
}): Promise<BranchMaintenanceCommandResult> {
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

    const existingBranch = await transaction.branch.findFirst({
      where: getTenantScopedBranchWhere(input.branchId, input.businessId),
      select: { id: true },
    });
    if (!existingBranch) {
      return { ok: false, reason: "BRANCH_NOT_FOUND" } as const;
    }

    const branch = await transaction.branch.update({
      where: { id: existingBranch.id },
      data: input.branch,
      select: { id: true, name: true },
    });
    await transaction.businessActivity.create({
      data: buildBranchAuditActivity({
        operation: "UPDATE",
        businessId: input.businessId,
        actorId: input.actor.id,
        actorBusinessId: input.actor.businessId,
        actorEmail: input.actor.email,
        branch,
        activityContext,
      }),
    });

    return { ok: true } as const;
  });
}

export async function setBranchStatusCommand(input: {
  businessId: string;
  branchId: string;
  isActive: boolean;
  actor: BranchCommandActor;
}): Promise<BranchMaintenanceCommandResult> {
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

    const existingBranch = await transaction.branch.findFirst({
      where: getTenantScopedBranchWhere(input.branchId, input.businessId),
      select: { id: true },
    });
    if (!existingBranch) {
      return { ok: false, reason: "BRANCH_NOT_FOUND" } as const;
    }

    const branch = await transaction.branch.update({
      where: { id: existingBranch.id },
      data: { isActive: input.isActive },
      select: { id: true, name: true },
    });
    await transaction.businessActivity.create({
      data: buildBranchAuditActivity({
        operation: input.isActive ? "ACTIVATE" : "DEACTIVATE",
        businessId: input.businessId,
        actorId: input.actor.id,
        actorBusinessId: input.actor.businessId,
        actorEmail: input.actor.email,
        branch,
        activityContext,
      }),
    });

    return { ok: true } as const;
  });
}
