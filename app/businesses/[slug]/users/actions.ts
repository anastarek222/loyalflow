"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
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
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessNotification } from "@/lib/notifications";
import { actionBooleanSchema, opaqueIdSchema } from "@/lib/validation/action-input";

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
    });

  if (!parsed.success) {
    redirect(
      `/businesses/${slug}/users?error=invalid`
    );
  }

  if (
    isBusinessOwner &&
    parsed.data.role === "OWNER"
  ) {
    redirect(
      `/businesses/${slug}/users?error=role`
    );
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
  const activityContext = await getActivityRequestContext();

  await prisma.$transaction(
    async (transaction) => {
      await transaction.user.create({
        data: {
          firstName:
            parsed.data.firstName,
          lastName:
            parsed.data.lastName ||
            null,
          email,
          passwordHash,
          role: parsed.data.role,
          businessId:
            business.id,
          isActive: true,
        },
      });

      await transaction
        .businessActivity
        .create({
          data: {
            type: "USER_CREATED",
            description:
              `تم إنشاء حساب ${
                parsed.data.role === "OWNER"
                  ? "مالك"
                  : parsed.data.role === "MANAGER"
                    ? "مدير"
                    : parsed.data.role === "VIEWER"
                      ? "مشاهد"
                      : "موظف"
              } للبريد ${email}`,
            businessId:
              business.id,
            ...activityActorFields(session.user, business.id),
            ...activityRequestMetadata(activityContext),
          },
        });

      await createBusinessNotification(
        transaction,
        {
          type: "USER_CREATED",
          title: "تم إنشاء حساب فريق جديد",
          message:
            `تم إنشاء حساب ${
              parsed.data.role === "OWNER"
                ? "مالك"
                : parsed.data.role === "MANAGER"
                  ? "مدير"
                  : parsed.data.role === "VIEWER"
                    ? "مشاهد"
                    : "موظف"
            } للبريد ${email}`,
          businessId:
            business.id,
        }
      );
    }
  );

  revalidateTeamPages(slug);

  redirect(
    `/businesses/${slug}/users?created=1`
  );
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
      data: {
        type: "USER_STATUS_CHANGED",
        description: parsedStatus.data
          ? `تم إعادة تفعيل الحساب ${targetUser.email}`
          : `تم إيقاف الحساب ${targetUser.email}`,
        businessId:
          business.id,
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
      },
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
      data: {
        type:
          "USER_PASSWORD_CHANGED",
        description:
          `تم تغيير كلمة المرور للحساب ${targetUser.email}`,
        businessId:
          business.id,
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
      },
    }),
  ]);

  revalidateTeamPages(slug);

  redirect(
    `/businesses/${slug}/users?success=password`
  );
}
