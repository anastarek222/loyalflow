import type { ActivityType } from "@/generated/prisma/client";

import type { ActivityRequestContext } from "@/lib/activity/request-context";

export function activityRequestMetadata(
  context: ActivityRequestContext,
) {
  return {
    ...(context.deviceName
      ? { deviceName: context.deviceName }
      : {}),
    ...(context.ipAddress
      ? { ipAddress: context.ipAddress }
      : {}),
  };
}

type ActivityActor = {
  id: string;
  businessId: string | null;
  email?: string | null;
};

/**
 * BusinessActivity uses a tenant-composite user relation. A global system
 * administrator is deliberately not tenant-scoped, so its identity is kept
 * as a server-derived metadata snapshot instead of violating that relation.
 */
export function activityActorFields(
  actor: ActivityActor,
  businessId: string,
) {
  if (actor.businessId === businessId) {
    return { createdById: actor.id };
  }

  return {
    metadata: {
      actorId: actor.id,
      ...(actor.email ? { actorEmail: actor.email } : {}),
    },
  };
}

type BranchAuditOperation =
  | "CREATE"
  | "UPDATE"
  | "ACTIVATE"
  | "DEACTIVATE"
  | "ASSIGN_STAFF"
  | "REMOVE_STAFF";

const branchActivityTypes: Record<
  BranchAuditOperation,
  ActivityType
> = {
  CREATE: "BRANCH_CREATED",
  UPDATE: "BRANCH_UPDATED",
  ACTIVATE: "BRANCH_ACTIVATED",
  DEACTIVATE: "BRANCH_DEACTIVATED",
  ASSIGN_STAFF: "BRANCH_STAFF_ASSIGNED",
  REMOVE_STAFF: "BRANCH_STAFF_REMOVED",
};

type BranchAuditInput = {
  operation: BranchAuditOperation;
  businessId: string;
  actorId: string;
  actorBusinessId: string | null;
  actorEmail?: string | null;
  branch: { id: string; name: string };
  activityContext: ActivityRequestContext;
  assignedUser?: { id: string; email: string };
};

export function buildBranchAuditActivity(
  input: BranchAuditInput,
) {
  const assignedUserSuffix = input.assignedUser
    ? ` للموظف ${input.assignedUser.email}`
    : "";
  const descriptions: Record<BranchAuditOperation, string> = {
    CREATE: `تم إنشاء الفرع ${input.branch.name}`,
    UPDATE: `تم تحديث بيانات الفرع ${input.branch.name}`,
    ACTIVATE: `تم تفعيل الفرع ${input.branch.name}`,
    DEACTIVATE: `تم إيقاف الفرع ${input.branch.name}`,
    ASSIGN_STAFF: `تم إسناد موظف إلى الفرع ${input.branch.name}${assignedUserSuffix}`,
    REMOVE_STAFF: `تمت إزالة إسناد موظف من الفرع ${input.branch.name}${assignedUserSuffix}`,
  };

  const metadata = {
    ...(input.assignedUser
      ? {
          assignedUserId: input.assignedUser.id,
          assignedUserEmail: input.assignedUser.email,
        }
      : {}),
    ...activityActorFields(
      {
        id: input.actorId,
        businessId: input.actorBusinessId,
        email: input.actorEmail,
      },
      input.businessId,
    ).metadata,
  };

  return {
    type: branchActivityTypes[input.operation],
    description: descriptions[input.operation],
    businessId: input.businessId,
    branchId: input.branch.id,
    ...activityActorFields(
      {
        id: input.actorId,
        businessId: input.actorBusinessId,
        email: input.actorEmail,
      },
      input.businessId,
    ),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    ...activityRequestMetadata(input.activityContext),
  };
}

export const branchActivityTypeValues = Object.values(branchActivityTypes);
