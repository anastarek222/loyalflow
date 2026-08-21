import type {
  ActivityType,
  ExperienceAccess,
  UserRole,
} from "@/generated/prisma/client";

import type { ActivityRequestContext } from "@/lib/activity/request-context";

export const STRUCTURED_ACTIVITY_PRESENTATION_VERSION = "R9_V1";

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

function actorMetadata(actor: ActivityActor, businessId: string) {
  const fields = activityActorFields(actor, businessId);
  return "metadata" in fields ? fields.metadata : undefined;
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
  const actor = {
    id: input.actorId,
    businessId: input.actorBusinessId,
    email: input.actorEmail,
  };
  const type = branchActivityTypes[input.operation];
  const metadata = {
    ...actorMetadata(actor, input.businessId),
    presentationVersion: STRUCTURED_ACTIVITY_PRESENTATION_VERSION,
    presentationKind: "BRANCH_AUDIT",
    operation: input.operation,
    branchName: input.branch.name,
    ...(input.assignedUser
      ? {
          assignedUserId: input.assignedUser.id,
          assignedUserEmail: input.assignedUser.email,
        }
      : {}),
  };

  return {
    type,
    description: `${type} branchName=${input.branch.name}${
      input.assignedUser
        ? ` assignedUserEmail=${input.assignedUser.email}`
        : ""
    }`,
    businessId: input.businessId,
    branchId: input.branch.id,
    ...activityActorFields(actor, input.businessId),
    metadata,
    ...activityRequestMetadata(input.activityContext),
  };
}

type UserAuditOperation =
  | "CREATE"
  | "ACTIVATE"
  | "DEACTIVATE"
  | "PASSWORD_CHANGE"
  | "EXPERIENCE_ACCESS_UPDATE";

const userActivityTypes: Record<UserAuditOperation, ActivityType> = {
  CREATE: "USER_CREATED",
  ACTIVATE: "USER_STATUS_CHANGED",
  DEACTIVATE: "USER_STATUS_CHANGED",
  PASSWORD_CHANGE: "USER_PASSWORD_CHANGED",
  EXPERIENCE_ACCESS_UPDATE: "USER_EXPERIENCE_ACCESS_UPDATED",
};

type UserAuditInput = {
  operation: UserAuditOperation;
  businessId: string;
  actor: ActivityActor;
  targetUser: {
    id: string;
    email: string;
    role?: UserRole;
  };
  activityContext: ActivityRequestContext;
  previousExperienceAccess?: ExperienceAccess;
  nextExperienceAccess?: ExperienceAccess;
};

export function buildUserAuditActivity(input: UserAuditInput) {
  const type = userActivityTypes[input.operation];
  const metadata = {
    ...actorMetadata(input.actor, input.businessId),
    presentationVersion: STRUCTURED_ACTIVITY_PRESENTATION_VERSION,
    presentationKind: "USER_AUDIT",
    operation: input.operation,
    targetUserId: input.targetUser.id,
    targetUserEmail: input.targetUser.email,
    ...(input.targetUser.role ? { targetUserRole: input.targetUser.role } : {}),
    ...(input.previousExperienceAccess
      ? { previousExperienceAccess: input.previousExperienceAccess }
      : {}),
    ...(input.nextExperienceAccess
      ? { nextExperienceAccess: input.nextExperienceAccess }
      : {}),
  };

  return {
    type,
    description: `${type} targetUserEmail=${input.targetUser.email}${
      input.targetUser.role ? ` role=${input.targetUser.role}` : ""
    }`,
    businessId: input.businessId,
    ...activityActorFields(input.actor, input.businessId),
    metadata,
    ...activityRequestMetadata(input.activityContext),
  };
}

export const branchActivityTypeValues = Object.values(branchActivityTypes);
