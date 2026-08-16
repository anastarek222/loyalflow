import { buildBranchAuditActivity } from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import { normalizeBranchInput } from "@/lib/branches/management";
import { isWithinPlanLimit } from "@/lib/entitlements";
import { configurationToPlanLimits } from "@/lib/entitlements-server";
import prisma from "@/lib/prisma";

export type CreateBranchCommandInput = Readonly<{
  businessId: string;
  actor: Readonly<{
    id: string;
    businessId: string | null;
    email?: string | null;
  }>;
  branch: ReturnType<typeof normalizeBranchInput>;
}>;

export type CreateBranchCommandResult =
  | Readonly<{ ok: true; branchId: string }>
  | Readonly<{
      ok: false;
      reason: "BUSINESS_NOT_FOUND" | "SUBSCRIPTION_RESTRICTED" | "PLAN_LIMIT";
    }>;

/**
 * Authoritative non-financial Branch creation boundary.
 *
 * The caller keeps authenticated tenant authorization, input parsing,
 * duplicate-name presentation handling, redirects and revalidation. This
 * command owns persisted expansion checks and the atomic branch + audit write.
 */
export async function createBranchCommand(
  input: CreateBranchCommandInput,
): Promise<CreateBranchCommandResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "EXPAND",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const business = await transaction.business.findUnique({
      where: { id: input.businessId },
      select: { plan: true },
    });
    if (!business) {
      return { ok: false, reason: "BUSINESS_NOT_FOUND" } as const;
    }

    const [configuration, branchCount] = await Promise.all([
      transaction.planConfiguration.findUnique({
        where: { plan: business.plan },
        select: {
          customerLimit: true,
          userLimit: true,
          branchLimit: true,
          offerLimit: true,
          rewardLimit: true,
        },
      }),
      transaction.branch.count({ where: { businessId: input.businessId } }),
    ]);

    const planLimits = configurationToPlanLimits(configuration, business.plan);
    if (
      !isWithinPlanLimit(
        business.plan,
        "BRANCHES",
        branchCount,
        1,
        planLimits,
      )
    ) {
      return { ok: false, reason: "PLAN_LIMIT" } as const;
    }

    const branch = await transaction.branch.create({
      data: { businessId: input.businessId, ...input.branch },
      select: { id: true, name: true },
    });

    await transaction.businessActivity.create({
      data: buildBranchAuditActivity({
        operation: "CREATE",
        businessId: input.businessId,
        actorId: input.actor.id,
        actorBusinessId: input.actor.businessId,
        actorEmail: input.actor.email,
        branch,
        activityContext,
      }),
    });

    return { ok: true, branchId: branch.id } as const;
  });
}
