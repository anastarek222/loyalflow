"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  password: z
    .string()
    .min(10)
    .max(100),

  role: z.enum([
    "OWNER",
    "STAFF",
  ]),
});

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(10)
      .max(100),

    confirmPassword: z
      .string()
      .min(10)
      .max(100),
  })
  .refine(
    (data) =>
      data.password ===
      data.confirmPassword,
    {
      path: ["confirmPassword"],
      message:
        "كلمتا المرور غير متطابقتين",
    }
  );

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

  const isSuperAdmin =
    session.user.role ===
    "SUPER_ADMIN";

  const isBusinessOwner =
    session.user.role === "OWNER" &&
    session.user.businessId ===
      business.id;

  if (
    !isSuperAdmin &&
    !isBusinessOwner
  ) {
    redirect("/dashboard");
  }

  return {
    session,
    business,
    isSuperAdmin,
    isBusinessOwner,
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
    parsed.data.role !== "STAFF"
  ) {
    redirect(
      `/businesses/${slug}/users?error=role`
    );
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
                  : "موظف"
              } للبريد ${email}`,
            businessId:
              business.id,
            createdById:
              session.user.id,
          },
        });
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
  const {
    session,
    business,
    isSuperAdmin,
  } =
    await getManagementContext(slug);

  const targetUser =
    await getTargetUser(
      business.id,
      userId
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
    targetUser.role !== "STAFF"
  ) {
    redirect(
      `/businesses/${slug}/users?error=permission`
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        isActive,
      },
    }),

    prisma.businessActivity.create({
      data: {
        type: "USER_STATUS_CHANGED",
        description: isActive
          ? `تم إعادة تفعيل الحساب ${targetUser.email}`
          : `تم إيقاف الحساب ${targetUser.email}`,
        businessId:
          business.id,
        createdById:
          session.user.id,
      },
    }),
  ]);

  revalidateTeamPages(slug);

  redirect(
    `/businesses/${slug}/users?success=${
      isActive
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
  const {
    session,
    business,
    isSuperAdmin,
  } =
    await getManagementContext(slug);

  const targetUser =
    await getTargetUser(
      business.id,
      userId
    );

  if (!targetUser) {
    redirect(
      `/businesses/${slug}/users?error=not-found`
    );
  }

  const ownerCanManageTarget =
    targetUser.role === "STAFF" ||
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
        createdById:
          session.user.id,
      },
    }),
  ]);

  revalidateTeamPages(slug);

  redirect(
    `/businesses/${slug}/users?success=password`
  );
}
