import { buildUserAuditActivity } from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  resolveExperienceAccess,
  type ExperienceAccess,
} from "@/lib/experience-mode";
import prisma from "@/lib/prisma";

export type UpdateTeamExperienceAccessCommandResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false;
      reason: "TARGET_NOT_FOUND" | "SUBSCRIPTION_RESTRICTED";
    }>;

export async function updateTeamExperienceAccessCommand(input: {
  businessId: string;
  userId: string;
  requestedAccess: ExperienceAccess;
  actor: Readonly<{
    id: string;
    businessId: string | null;
    email?: string | null;
  }>;
}): Promise<UpdateTeamExperienceAccessCommandResult> {
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

    const targetUser = await transaction.user.findFirst({
      where: {
        id: input.userId,
        businessId: input.businessId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        experienceAccess: true,
      },
    });
    if (!targetUser) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    const experienceAccess = resolveExperienceAccess(
      targetUser.role,
      input.requestedAccess,
    );

    await transaction.user.update({
      where: { id: targetUser.id },
      data: { experienceAccess },
    });
    await transaction.businessActivity.create({
      data: buildUserAuditActivity({
        operation: "EXPERIENCE_ACCESS_UPDATE",
        businessId: input.businessId,
        actor: input.actor,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          role: targetUser.role,
        },
        previousExperienceAccess: targetUser.experienceAccess,
        nextExperienceAccess: experienceAccess,
        activityContext,
      }),
    });

    return { ok: true } as const;
  });
}
