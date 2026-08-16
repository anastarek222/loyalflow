import type { Prisma } from "@/generated/prisma/client";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import prisma from "@/lib/prisma";

export type UpdateBusinessSettingsCommandInput = Readonly<{
  businessId: string;
  user: Parameters<typeof activityActorFields>[0];
  description: string;
  data: Parameters<typeof prisma.business.update>[0]["data"];
  metadata?: Prisma.InputJsonObject;
  enforceOperateEntitlement?: boolean;
}>;

export type UpdateBusinessSettingsCommandResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: "SUBSCRIPTION_RESTRICTED" }>;

/**
 * Authoritative non-financial Business Settings write boundary.
 *
 * Presentation concerns (redirects, path revalidation and optional provider
 * synchronization) deliberately remain with the existing Server Action
 * compatibility layer. The business mutation and its audit record stay atomic.
 */
export async function updateBusinessSettingsCommand(
  input: UpdateBusinessSettingsCommandInput,
): Promise<UpdateBusinessSettingsCommandResult> {
  const activityContext = await getActivityRequestContext();
  const actorFields = activityActorFields(input.user, input.businessId);
  const createdById =
    "createdById" in actorFields ? actorFields.createdById : undefined;
  const actorMetadata =
    "metadata" in actorFields ? actorFields.metadata : undefined;

  const updated = await prisma.$transaction(async (transaction) => {
    if (
      input.enforceOperateEntitlement &&
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return false;
    }

    await transaction.business.update({
      where: { id: input.businessId },
      data: input.data,
    });

    await transaction.businessActivity.create({
      data: {
        type: "BUSINESS_SETTINGS_UPDATED",
        description: input.description,
        businessId: input.businessId,
        ...(createdById ? { createdById } : {}),
        ...(actorMetadata || input.metadata
          ? {
              metadata: {
                ...(actorMetadata ?? {}),
                ...(input.metadata ?? {}),
              },
            }
          : {}),
        ...activityRequestMetadata(activityContext),
      },
    });

    return true;
  });

  return updated
    ? { ok: true }
    : { ok: false, reason: "SUBSCRIPTION_RESTRICTED" };
}
