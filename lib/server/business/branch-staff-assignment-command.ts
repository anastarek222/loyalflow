import { buildBranchAuditActivity } from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  getBranchAssignmentEligibility,
  getTenantScopedAssignmentWhere,
  getTenantScopedBranchWhere,
} from "@/lib/branches/management";
import prisma from "@/lib/prisma";
import type { BranchCommandActor } from "@/lib/server/business/branch-maintenance-command";

export type AssignStaffToBranchCommandResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false;
      reason:
        | "BRANCH_NOT_FOUND"
        | "INELIGIBLE_USER"
        | "SUBSCRIPTION_RESTRICTED";
    }>;

export type RemoveStaffAssignmentCommandResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false;
      reason: "ASSIGNMENT_NOT_FOUND" | "SUBSCRIPTION_RESTRICTED";
    }>;

export async function assignStaffToBranchCommand(input: {
  businessId: string;
  branchId: string;
  userId: string;
  actor: BranchCommandActor;
}): Promise<AssignStaffToBranchCommandResult> {
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

    const [branch, user] = await Promise.all([
      transaction.branch.findFirst({
        where: getTenantScopedBranchWhere(input.branchId, input.businessId),
        select: { id: true, businessId: true, isActive: true, name: true },
      }),
      transaction.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          businessId: true,
          isActive: true,
          role: true,
          email: true,
        },
      }),
    ]);

    if (!branch) {
      return { ok: false, reason: "BRANCH_NOT_FOUND" } as const;
    }
    if (!user) {
      return { ok: false, reason: "INELIGIBLE_USER" } as const;
    }

    const eligibility = getBranchAssignmentEligibility({
      businessId: input.businessId,
      branch,
      user,
    });
    if (eligibility !== "ELIGIBLE") {
      return { ok: false, reason: "INELIGIBLE_USER" } as const;
    }

    await transaction.branchStaffAssignment.create({
      data: {
        businessId: input.businessId,
        branchId: branch.id,
        userId: user.id,
      },
    });
    await transaction.businessActivity.create({
      data: buildBranchAuditActivity({
        operation: "ASSIGN_STAFF",
        businessId: input.businessId,
        actorId: input.actor.id,
        actorBusinessId: input.actor.businessId,
        actorEmail: input.actor.email,
        branch,
        assignedUser: user,
        activityContext,
      }),
    });

    return { ok: true } as const;
  });
}

export async function removeStaffAssignmentCommand(input: {
  businessId: string;
  assignmentId: string;
  actor: BranchCommandActor;
}): Promise<RemoveStaffAssignmentCommandResult> {
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

    const assignment = await transaction.branchStaffAssignment.findFirst({
      where: getTenantScopedAssignmentWhere(input.assignmentId, input.businessId),
      select: {
        id: true,
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
    });
    if (!assignment) {
      return { ok: false, reason: "ASSIGNMENT_NOT_FOUND" } as const;
    }

    await transaction.branchStaffAssignment.delete({
      where: { id: assignment.id },
    });
    await transaction.businessActivity.create({
      data: buildBranchAuditActivity({
        operation: "REMOVE_STAFF",
        businessId: input.businessId,
        actorId: input.actor.id,
        actorBusinessId: input.actor.businessId,
        actorEmail: input.actor.email,
        branch: assignment.branch,
        assignedUser: assignment.user,
        activityContext,
      }),
    });

    return { ok: true } as const;
  });
}
