"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { buildUserAuditActivity } from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import {
  passwordConfirmationSchema,
  passwordValueSchema,
} from "@/lib/auth/password-policy";
import {
  canPerform,
  isBusinessOwner as isBusinessOwnerRole,
  isSuperAdmin as isSuperAdminRole,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { isWithinPlanLimit } from "@/lib/entitlements";
import { getEffectivePlanLimits } from "@/lib/entitlements-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateTeamExperienceAccessCommand } from "@/lib/server/business/team-experience-access-command";
import { provisionBusinessUserCommand } from "@/lib/server/business/team-provisioning-command";
import { actionBooleanSchema, opaqueIdSchema } from "@/lib/validation/action-input";
import {
  EXPERIENCE_ACCESS_VALUES,
  getDefaultExperienceAccess,
  resolveExperienceAccess,
} from "@/lib/experience-mode";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";

const experienceAccessSchema = z.enum(EXPERIENCE_ACCESS_VALUES);

const userSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2)
    .max(50),

  lastName: z
    .string()
    .trim()
    .max(50)
    .optional(),

  email: z
    .string()
    .trim()
    .email()
    .max(120),

  password: passwordValueSchema,

  experienceAccess: experienceAccessSchema.optional(),

  role: z.enum([
    "OWNER",
    "MANAGER",
    "STAFF",
    "VIEWER",
  ]),
});

const passwordSchema = passwordConfirmationSchema;

async function getManagementContext(
  slug: string
) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business =
    await prisma.business.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        slug: true,
        plan: true,
        subscriptionLifecycleState: true,
      },
    });

  if (!business) {
    redirect("/businesses");
  }

  const hasSuperAdminRole =
    isSuperAdminRole(session.user);

  const hasBusinessOwnerRole =
    isBusinessOwnerRole(
      session.user,
      business.id
    );

  if (!canPerform(session.user, business.id, "STAFF_MANAGE")) {
    redirect("/dashboard");
  }

  return {
    session,
    business,
    isSuperAdmin: hasSuperAdminRole,
    isBusinessOwner: hasBusinessOwnerRole,
  };
}

async function getTargetUser(
  businessId: string,
  userId: string
) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      businessId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      experienceAccess: true,
      isActive: true,
    },
  });
}

function revalidateTeamPages(
  slug: string
) {
  revalidatePath(
    `/businesses/${slug}`
  );
  revalidatePath(
    `/businesses/${slug}/users`
  );
  revalidatePath(
    `/businesses/${slug}/activity`
  );
  revalidatePath("/dashboard");
}

export async function createBusinessUserAction(
  slug: string,
  formData: FormData
) {
  const {
    session,
    business,
    isBusinessOwner,
    isSuperAdmin,
  } =
    await getManagementContext(slug);

  const parsed =
    userSchema.safeParse({
      firstName:
        formData.get("firstName"),
      lastName:
        formData.get("lastName") ||
        undefined,
      email: formData.get("email"),
      password:
        formData.get("password"),
      role: formData.get("role"),
      experienceAccess: formData.get("experienceAccess") || undefined,
    });

  if (!parsed.success) {
    redirect(
      `/businesses/${slug}/users?error=invalid`
    );
  }

  if (!isBusinessOwner && !isSuperAdmin) {
    redirect(`/businesses/${slug}/users?error=permission`);
  }
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "EXPAND",
    )
  ) {
    redirect(`/businesses/${slug}/users?error=subscription-restricted`);
  }

  if (
    isBusinessOwner &&
    parsed.data.role === "OWNER"
  ) {
    redirect(
      `/businesses/${slug}/users?error=role`
    );
  }

  const [currentUserCount, planLimits] = await Promise.all([
    prisma.user.count({ where: { businessId: business.id } }),
    getEffectivePlanLimits(business.plan),
  ]);
  if (!isWithinPlanLimit(business.plan, "USERS", currentUserCount, 1, planLimits)) {
    redirect(`/businesses/${slug}/users?error=plan-limit`);
  }

  if (parsed.data.role === "OWNER") {
    const existingBusinessOwner =
      await prisma.user.findFirst({
        where: {
          businessId: business.id,
          role: "OWNER",
        },
        select: {
          id: true,
        },
      });

    if (existingBusinessOwner) {
      redirect(
        `/businesses/${slug}/users?error=owner-exists`
      );
    }
  }

  const email =
    parsed.data.email.toLowerCase();

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

  if (existingUser) {
    redirect(
      `/businesses/${slug}/users?error=email`
    );
  }

  const passwordHash =
    await hash(
      parsed.data.password,
      12
    );
  const creation = await provisionBusinessUserCommand({
    businessId: business.id,
    actor: session.user,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName || null,
    email,
    passwordHash,
    role: parsed.data.role,
    experienceAccess: resolveExperienceAccess(
      parsed.data.role,
      parsed.data.experienceAccess ?? getDefaultExperienceAccess(parsed.data.role),
    ),
  });

  if (!creation.ok) {
    if (creation.reason === "BUSINESS_NOT_FOUND") {
      redirect("/businesses");
    }
    const error =
      creation.reason === "PLAN_LIMIT"
        ? "plan-limit"
        : creation.reason === "OWNER_EXISTS"
          ? "owner-exists"
          : creation.reason === "EMAIL_EXISTS"
            ? "email"
            : "subscription-restricted";
    redirect(`/businesses/${slug}/users?error=${error}`);
  }

  revalidateTeamPages(slug);

  redirect(
    `/businesses/${slug}/users?created=1`
  );
}

export async function updateBusinessUserExperienceAccessAction(
  slug: string,
  userId: string,
  formData: FormData,
) {
  const parsedUserId = opaqueIdSchema.safeParse(userId);
  const parsedAccess = experienceAccessSchema.safeParse(formData.get("experienceAccess"));

  if (!parsedUserId.success || !parsedAccess.success) {
    redirect(`/businesses/${slug}/users?error=invalid`);
  }

  const { session, business, isBusinessOwner, isSuperAdmin } = await getManagementContext(slug);
  if (!isBusinessOwner && !isSuperAdmin) {
    redirect(`/businesses/${slug}/users?error=permission`);
  }
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${slug}/users?error=subscription-restricted`);
  }

  const targetUser = await getTargetUser(business.id, parsedUserId.data);
  if (!targetUser) {
    redirect(`/businesses/${slug}/users?error=not-found`);
  }

  const result = await updateTeamExperienceAccessCommand({
    businessId: business.id,
    userId: targetUser.id,
    requestedAccess: parsedAccess.data,
    actor: session.user,
  });
  if (!result.ok) {
    redirect(
      `/businesses/${slug}/users?error=${
        result.reason === "SUBSCRIPTION_RESTRICTED"
          ? "subscription-restricted"
          : "not-found"
      }`,
    );
  }

  revalidateTeamPages(slug);
  redirect(`/businesses/${slug}/users?success=experience-access`);
}

export async function setBusinessUserStatusAction(
  slug: string,
  userId: string,
  isActive: boolean
) {
  const parsedUserId = opaqueIdSchema.safeParse(userId);
  const parsedStatus = actionBooleanSchema.safeParse(isActive);

  if (!parsedUserId.success || !parsedStatus.success) {
    redirect(`/businesses/${slug}/users?error=invalid`);
  }

  const {
    session,
    business,
    isSuperAdmin,
  } =
    await getManagementContext(slug);

  const targetUser =
    await getTargetUser(
      business.id,
      parsedUserId.data
    );

  if (!targetUser) {
    redirect(
      `/businesses/${slug}/users?error=not-found`
    );
  }

  if (
    targetUser.id ===
    session.user.id
  ) {
    redirect(
      `/businesses/${slug}/users?error=self-status`
    );
  }

  if (
    !isSuperAdmin &&
    targetUser.role === "OWNER"
  ) {
    redirect(
      `/businesses/${slug}/users?error=permission`
    );
  }

  const activityContext = await getActivityRequestContext();
  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        isActive: parsedStatus.data,
      },
    }),

    prisma.businessActivity.create({
      data: buildUserAuditActivity({
        operation: parsedStatus.data ? "ACTIVATE" : "DEACTIVATE",
        businessId: business.id,
        actor: session.user,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          role: targetUser.role,
        },
        activityContext,
      }),
    }),
  ]);

  revalidateTeamPages(slug);

  redirect(
    `/businesses/${slug}/users?success=${
      parsedStatus.data
        ? "activated"
        : "deactivated"
    }`
  );
}

export async function resetBusinessUserPasswordAction(
  slug: string,
  userId: string,
  formData: FormData
) {
  const parsedUserId = opaqueIdSchema.safeParse(userId);

  if (!parsedUserId.success) {
    redirect(`/businesses/${slug}/users?error=invalid`);
  }

  const {
    session,
    business,
    isSuperAdmin,
  } =
    await getManagementContext(slug);

  const targetUser =
    await getTargetUser(
      business.id,
      parsedUserId.data
    );

  if (!targetUser) {
    redirect(
      `/businesses/${slug}/users?error=not-found`
    );
  }

  const ownerCanManageTarget =
    targetUser.role !== "OWNER" ||
    targetUser.id ===
      session.user.id;

  if (
    !isSuperAdmin &&
    !ownerCanManageTarget
  ) {
    redirect(
      `/businesses/${slug}/users?error=permission`
    );
  }

  const parsed =
    passwordSchema.safeParse({
      password:
        formData.get("password"),
      confirmPassword:
        formData.get(
          "confirmPassword"
        ),
    });

  if (!parsed.success) {
    redirect(
      `/businesses/${slug}/users?error=password`
    );
  }

  const passwordHash =
    await hash(
      parsed.data.password,
      12
    );
  const activityContext = await getActivityRequestContext();

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        passwordHash,
        authVersion: {
          increment: 1,
        },
      },
    }),

    prisma.businessActivity.create({
      data: buildUserAuditActivity({
        operation: "PASSWORD_CHANGE",
        businessId: business.id,
        actor: session.user,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          role: targetUser.role,
        },
        activityContext,
      }),
    }),
  ]);

  revalidateTeamPages(slug);

  redirect(
    `/businesses/${slug}/users?success=password`
  );
}
