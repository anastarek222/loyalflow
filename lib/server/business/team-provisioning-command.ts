import type {
  ExperienceAccess,
  UserRole,
} from "@/generated/prisma/client";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  configurationToPlanLimits,
} from "@/lib/entitlements-server";
import { isWithinPlanLimit } from "@/lib/entitlements";
import { createBusinessNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

export type ProvisionBusinessUserCommandInput = Readonly<{
  businessId: string;
  actor: Parameters<typeof activityActorFields>[0];
  firstName: string;
  lastName: string | null;
  email: string;
  passwordHash: string;
  role: Exclude<UserRole, "SUPER_ADMIN">;
  experienceAccess: ExperienceAccess;
}>;

export type ProvisionBusinessUserCommandResult =
  | Readonly<{ ok: true; userId: string }>
  | Readonly<{
      ok: false;
      reason:
        | "BUSINESS_NOT_FOUND"
        | "SUBSCRIPTION_RESTRICTED"
        | "PLAN_LIMIT"
        | "OWNER_EXISTS"
        | "EMAIL_EXISTS";
    }>;

function roleLabel(role: ProvisionBusinessUserCommandInput["role"]) {
  return role === "OWNER"
    ? "مالك"
    : role === "MANAGER"
      ? "مدير"
      : role === "VIEWER"
        ? "مشاهد"
        : "موظف";
}

/**
 * Authoritative non-financial team-account provisioning boundary.
 *
 * The caller remains responsible for authenticated management authorization,
 * input parsing, password-policy validation/hashing, redirects and revalidation.
 * This command owns persisted expansion checks and the atomic user lifecycle.
 */
export async function provisionBusinessUserCommand(
  input: ProvisionBusinessUserCommandInput,
): Promise<ProvisionBusinessUserCommandResult> {
  const activityContext = await getActivityRequestContext();
  const normalizedEmail = input.email.trim().toLowerCase();

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

    const [configuration, currentUserCount, existingUser, existingOwner] =
      await Promise.all([
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
        transaction.user.count({ where: { businessId: input.businessId } }),
        transaction.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        }),
        input.role === "OWNER"
          ? transaction.user.findFirst({
              where: { businessId: input.businessId, role: "OWNER" },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

    const planLimits = configurationToPlanLimits(configuration, business.plan);
    if (
      !isWithinPlanLimit(
        business.plan,
        "USERS",
        currentUserCount,
        1,
        planLimits,
      )
    ) {
      return { ok: false, reason: "PLAN_LIMIT" } as const;
    }
    if (existingOwner) {
      return { ok: false, reason: "OWNER_EXISTS" } as const;
    }
    if (existingUser) {
      return { ok: false, reason: "EMAIL_EXISTS" } as const;
    }

    const createdUser = await transaction.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: normalizedEmail,
        passwordHash: input.passwordHash,
        role: input.role,
        experienceAccess: input.experienceAccess,
        businessId: input.businessId,
        isActive: true,
      },
      select: { id: true },
    });

    await transaction.$executeRaw`
      INSERT INTO "EmailVerificationState" (
        "userId", "verifiedAt", "createdAt", "updatedAt"
      ) VALUES (
        ${createdUser.id}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;

    const label = roleLabel(input.role);
    await transaction.businessActivity.create({
      data: {
        type: "USER_CREATED",
        description: `تم إنشاء حساب ${label} للبريد ${normalizedEmail}`,
        businessId: input.businessId,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
    });

    await createBusinessNotification(transaction, {
      type: "USER_CREATED",
      title: "تم إنشاء حساب فريق جديد",
      message: `تم إنشاء حساب ${label} للبريد ${normalizedEmail}`,
      businessId: input.businessId,
    });

    return { ok: true, userId: createdUser.id } as const;
  });
}
