"use server";

import { auth } from "@/auth";
import {
  getEarnDetails,
  getRewardLabel,
} from "@/lib/loyalty/operations";
import {
  getRapidEarnRateLimitKey,
  getRapidEarnWhere,
  getRapidRedemptionRateLimitKey,
  getRapidRedemptionWhere,
  RAPID_EARN_WINDOW_MS,
} from "@/lib/loyalty/fraud";
import {
  isFinancialOperationAbortedError,
  isFinancialOperationConflictError,
  recordBalanceAdjustment,
  recordLoyaltyEarn,
  recordRewardRedemption,
} from "@/lib/loyalty/transactions";
import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import {
  calculatePromotionBonus,
  selectEligiblePromotion,
} from "@/lib/promotions/engine";
import {
  getRewardExpiryDate,
  getRewardUnlockRedemptionState,
} from "@/lib/rewards/expiration";
import { createReferralCodeCandidate } from "@/lib/referrals/code";
import {
  customerNoteContentSchema,
  customerTagNameSchema,
} from "@/lib/customers/notes-tags";
import {
  canAccessBusiness,
  canPerform,
  type Capability,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/utils/rate-limiter";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { createBusinessNotification } from "@/lib/notifications";
import { getActivityRequestContext } from "@/lib/activity/request-context";

const customerSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().max(50).optional(),
  phone: z.string().trim().min(8).max(25),
});

const adjustmentSchema = z.object({
  direction: z.enum(["ADD", "SUBTRACT"]),

  amount: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000000),

  reason: z.string().trim().min(3).max(200),
});

const saleAmountSchema = z.object({
  saleAmount: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000000000),
});

const financialOperationSchema = z.string().uuid();

function getOptionalOperationId(formData: FormData | undefined, field: string) {
  const value = formData?.get(field);
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function getFinancialActor(session: { user: FinancialOperationActor }) {
  return session.user;
}

async function createRewardUnlocksForEarn(
  transaction: Prisma.TransactionClient,
  input: {
    businessId: string;
    customerId: string;
    createdById: string;
    balanceAfter: number;
  }
) {
  const now = new Date();
  const expiringRewards = await transaction.reward.findMany({
    where: {
      businessId: input.businessId,
      isActive: true,
      expiresAfterDays: { not: null },
      cost: { lte: input.balanceAfter },
    },
    select: {
      id: true,
      name: true,
      expiresAfterDays: true,
    },
  });

  for (const reward of expiringRewards) {
    const currentUnlock = await transaction.rewardUnlock.findFirst({
      where: {
        businessId: input.businessId,
        customerId: input.customerId,
        rewardId: reward.id,
        redeemedAt: null,
      },
      orderBy: { unlockedAt: "desc" },
      select: { id: true },
    });

    if (reward.expiresAfterDays === null) {
      continue;
    }

    if (currentUnlock) {
      const unlock = await transaction.rewardUnlock.findFirstOrThrow({
        where: {
          id: currentUnlock.id,
          businessId: input.businessId,
          customerId: input.customerId,
          rewardId: reward.id,
        },
      });
      const unlockState = getRewardUnlockRedemptionState({
        expectedBusinessId: input.businessId,
        unlockBusinessId: unlock.businessId,
        rewardBusinessId: input.businessId,
        expiresAt: unlock.expiresAt,
        redeemedAt: unlock.redeemedAt,
        expiredAt: unlock.expiredAt,
        now,
      });

      if (unlockState === "ACTIVE") {
        continue;
      }

      if (!unlock.expiredAt) {
        const expired = await transaction.rewardUnlock.updateMany({
          where: {
            id: unlock.id,
            businessId: input.businessId,
            customerId: input.customerId,
            rewardId: reward.id,
            redeemedAt: null,
            expiredAt: null,
            expiresAt: { lte: now },
          },
          data: { expiredAt: now },
        });
        if (expired.count === 1) {
          await transaction.businessActivity.create({
            data: {
              type: "REWARD_EXPIRED",
              description: `انتهت صلاحية ${reward.name}`,
              businessId: input.businessId,
              customerId: input.customerId,
              createdById: input.createdById,
            },
          });
        }
      }
    }

    const expiresAt = getRewardExpiryDate(
      now,
      reward.expiresAfterDays
    );
    try {
      await transaction.rewardUnlock.create({
        data: {
          businessId: input.businessId,
          customerId: input.customerId,
          rewardId: reward.id,
          unlockedAt: now,
          expiresAt,
        },
      });
    } catch (error) {
      // A concurrent earn may have unlocked this same reward first. Keep the
      // earned balance and do not create a duplicate entitlement or activity.
      if (!(typeof error === "object" && error && "code" in error && error.code === "P2002")) {
        throw error;
      }
      continue;
    }
    await transaction.businessActivity.create({
      data: {
        type: "REWARD_UNLOCKED",
        description: `تم فتح ${reward.name} حتى ${expiresAt.toISOString()}`,
        businessId: input.businessId,
        customerId: input.customerId,
        createdById: input.createdById,
      },
    });

    await createBusinessNotification(
      transaction,
      {
        type: "REWARD_UNLOCKED",
        title: "تم فتح مكافأة جديدة",
        message: `تم فتح ${reward.name} للعميل`,
        businessId: input.businessId,
      }
    );
  }
}

function normalizePhone(value: string) {
  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned.replace(/(?!^)\+/g, "");
}

async function getBusinessAccess(slug: string) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      slug: true,
      earnAmount: true,
      rewardType: true,
      rewardCode: true,
      rewardDescription: true,
      unitName: true,
      rewardThreshold: true,
      rewardName: true,
      loyaltyMode: true,
      staffAttributionEnabled: true,
      staffAttributionRequired: true,
    },
  });

  if (!business) {
    redirect("/businesses");
  }

  if (!canAccessBusiness(session.user, business.id)) {
    redirect("/dashboard");
  }

  return {
    session,
    business,
  };
}

async function getActionContext(
  slug: string,
  customerId: string,
  capability: Capability
) {
  const { session, business } =
    await getBusinessAccess(slug);

  if (!canPerform(session.user, business.id, capability)) {
    redirect(`/businesses/${slug}/customers/${customerId}`);
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId: business.id,
      isActive: true,
    },
    select: {
      id: true,
      balance: true,
      publicToken: true,
    },
  });

  if (!customer) {
    redirect(`/businesses/${slug}/customers`);
  }

  return {
    session,
    business,
    customer,
  };
}

async function getManagementContext(
  slug: string,
  customerId: string,
  capability: Capability = "CUSTOMERS_EDIT"
) {
  const { session, business } =
    await getBusinessAccess(slug);

  if (!canPerform(session.user, business.id, capability)) {
    redirect(
      `/businesses/${slug}/customers/${customerId}`
    );
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId: business.id,
    },
    select: {
      id: true,
      phone: true,
      publicToken: true,
      isActive: true,
      balance: true,
    },
  });

  if (!customer) {
    redirect(`/businesses/${slug}/customers`);
  }

  return {
    session,
    business,
    customer,
  };
}

function revalidateCustomerPages(
  slug: string,
  customerId: string,
  publicToken: string
) {
  revalidatePath(
    `/businesses/${slug}/customers/${customerId}`
  );
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/reports`);
  revalidatePath(`/businesses/${slug}/activity`);
  revalidatePath(`/card/${publicToken}`);
  revalidatePath("/dashboard");
}

export async function updateCustomerAction(
  slug: string,
  customerId: string,
  formData: FormData
) {
  const {
    session,
    business,
    customer,
  } = await getManagementContext(
    slug,
    customerId,
    "LOYALTY_ADJUST"
  );

  const parsed = customerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName:
      formData.get("lastName") || undefined,
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    redirect(
      `/businesses/${slug}/customers/${customerId}?error=invalid`
    );
  }

  const phone = normalizePhone(parsed.data.phone);

  if (!/^\+?\d{8,15}$/.test(phone)) {
    redirect(
      `/businesses/${slug}/customers/${customerId}?error=phone`
    );
  }

  const duplicateCustomer =
    await prisma.customer.findFirst({
      where: {
        businessId: business.id,
        phone,
        id: {
          not: customer.id,
        },
      },
      select: {
        id: true,
      },
    });

  if (duplicateCustomer) {
    redirect(
      `/businesses/${slug}/customers/${customerId}?error=duplicate`
    );
  }

  const updatedCustomerName = [
    parsed.data.firstName,
    parsed.data.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  await prisma.$transaction([
    prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName || null,
        phone,
      },
    }),

    prisma.businessActivity.create({
      data: {
        type: "CUSTOMER_UPDATED",
        description: `تم تحديث بيانات العميل ${updatedCustomerName}`,
        businessId: business.id,
        customerId: customer.id,
        createdById: session.user.id,
      },
    }),
  ]);

  await syncBusinessToGoogleSheetSafely(
    business.id
  );

  revalidateCustomerPages(
    slug,
    customer.id,
    customer.publicToken
  );

  redirect(
    `/businesses/${slug}/customers/${customer.id}?success=updated`
  );
}

export async function setCustomerStatusAction(
  slug: string,
  customerId: string,
  isActive: boolean
) {
  const {
    session,
    business,
    customer,
  } = await getManagementContext(
    slug,
    customerId
  );

  await prisma.$transaction([
    prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        isActive,
      },
    }),

    prisma.businessActivity.create({
      data: {
        type: isActive
          ? "CUSTOMER_REACTIVATED"
          : "CUSTOMER_DEACTIVATED",
        description: isActive
          ? "تم إعادة تفعيل حساب العميل"
          : "تم إيقاف حساب العميل",
        businessId: business.id,
        customerId: customer.id,
        createdById: session.user.id,
      },
    }),
  ]);

  await syncBusinessToGoogleSheetSafely(
    business.id
  );

  revalidateCustomerPages(
    slug,
    customer.id,
    customer.publicToken
  );

  redirect(
    `/businesses/${slug}/customers/${customer.id}?success=${
      isActive ? "reactivated" : "deactivated"
    }`
  );
}

export async function adjustCustomerBalanceAction(
  slug: string,
  customerId: string,
  formData: FormData
) {
  const {
    session,
    business,
    customer,
  } = await getManagementContext(
    slug,
    customerId
  );

  const parsed = adjustmentSchema.safeParse({
    direction: formData.get("direction"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirect(
      `/businesses/${slug}/customers/${customerId}?error=adjustment-invalid`
    );
  }

  const parsedOperation = financialOperationSchema.safeParse(
    formData.get("operationId"),
  );

  if (!parsedOperation.success) {
    redirect(
      `/businesses/${slug}/customers/${customerId}?error=adjustment-invalid`,
    );
  }

  const adjustmentActivityContext =
    await getActivityRequestContext();

  let newBalance: number | null;

  try {
    newBalance = await prisma.$transaction(
      (transaction) =>
        recordBalanceAdjustment(transaction, {
          customerId: customer.id,
          businessId: business.id,
          actor: getFinancialActor(session),
          branchId: getOptionalOperationId(formData, "branchId"),
          attributedStaffId: getOptionalOperationId(formData, "attributedStaffId"),
          activityContext: adjustmentActivityContext,
          direction: parsed.data.direction,
          amount: parsed.data.amount,
          reason: parsed.data.reason,
          idempotencyKey: parsedOperation.data,
        }),
    );
  } catch (error) {
    if (isFinancialOperationConflictError(error)) {
      redirect(
        `/businesses/${slug}/customers/${customerId}?error=adjustment-conflict`,
      );
    }

    throw error;
  }

  if (newBalance === null) {
    redirect(
      parsed.data.direction === "SUBTRACT"
        ? `/businesses/${slug}/customers/${customerId}?error=adjustment-negative`
        : `/businesses/${slug}/customers/${customerId}?error=adjustment-invalid`
    );
  }

  await syncBusinessToGoogleSheetSafely(
    business.id
  );

  revalidateCustomerPages(
    slug,
    customer.id,
    customer.publicToken
  );

  redirect(
    `/businesses/${slug}/customers/${customer.id}?success=adjusted`
  );
}

export async function createCustomerReferralCodeAction(
  slug: string,
  customerId: string
) {
  const { business, customer } = await getManagementContext(
    slug,
    customerId,
    "CUSTOMERS_EDIT"
  );

  const existing = await prisma.customerReferralCode.findUnique({
    where: {
      businessId_customerId: {
        businessId: business.id,
        customerId: customer.id,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    let created = false;
    for (let attempt = 0; attempt < 10 && !created; attempt += 1) {
      try {
        await prisma.customerReferralCode.create({
          data: {
            businessId: business.id,
            customerId: customer.id,
            code: createReferralCodeCandidate(),
          },
        });
        created = true;
      } catch (error) {
        if (!(typeof error === "object" && error && "code" in error && error.code === "P2002")) {
          throw error;
        }
        const codeCreatedByAnotherRequest =
          await prisma.customerReferralCode.findUnique({
            where: {
              businessId_customerId: {
                businessId: business.id,
                customerId: customer.id,
              },
            },
            select: { id: true },
          });
        if (codeCreatedByAnotherRequest) created = true;
      }
    }

    if (!created) {
      redirect(`/businesses/${slug}/customers/${customer.id}?error=referral`);
    }
  }

  revalidateCustomerPages(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=referral-link`);
}

export async function createAndAssignCustomerTagAction(
  slug: string,
  customerId: string,
  formData: FormData
) {
  const { session, business, customer } = await getManagementContext(
    slug,
    customerId,
    "CUSTOMERS_EDIT"
  );
  const parsed = customerTagNameSchema.safeParse(formData.get("tagName"));

  if (!parsed.success) {
    redirect(`/businesses/${slug}/customers/${customer.id}?error=tag-invalid`);
  }

  const tag = await prisma.customerTag.upsert({
    where: {
      businessId_name: {
        businessId: business.id,
        name: parsed.data,
      },
    },
    create: {
      businessId: business.id,
      name: parsed.data,
    },
    update: {},
    select: { id: true, name: true },
  });

  const existing = await prisma.customerTagAssignment.findUnique({
    where: {
      customerId_tagId: {
        customerId: customer.id,
        tagId: tag.id,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.customerTagAssignment.create({
        data: {
          businessId: business.id,
          customerId: customer.id,
          tagId: tag.id,
        },
      }),
      prisma.businessActivity.create({
        data: {
          type: "CUSTOMER_TAG_ASSIGNED",
          description: `تمت إضافة وسم العميل: ${tag.name}`,
          businessId: business.id,
          customerId: customer.id,
          createdById: session.user.id,
        },
      }),
    ]);
  }

  revalidateCustomerPages(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=tag-assigned`);
}

export async function assignCustomerTagAction(
  slug: string,
  customerId: string,
  tagId: string
) {
  const { session, business, customer } = await getManagementContext(
    slug,
    customerId,
    "CUSTOMERS_EDIT"
  );
  const tag = await prisma.customerTag.findFirst({
    where: { id: tagId, businessId: business.id },
    select: { id: true, name: true },
  });

  if (!tag) {
    redirect(`/businesses/${slug}/customers/${customer.id}?error=tag-invalid`);
  }

  const existing = await prisma.customerTagAssignment.findUnique({
    where: {
      customerId_tagId: { customerId: customer.id, tagId: tag.id },
    },
    select: { id: true },
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.customerTagAssignment.create({
        data: {
          businessId: business.id,
          customerId: customer.id,
          tagId: tag.id,
        },
      }),
      prisma.businessActivity.create({
        data: {
          type: "CUSTOMER_TAG_ASSIGNED",
          description: `تمت إضافة وسم العميل: ${tag.name}`,
          businessId: business.id,
          customerId: customer.id,
          createdById: session.user.id,
        },
      }),
    ]);
  }

  revalidateCustomerPages(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=tag-assigned`);
}

export async function removeCustomerTagAction(
  slug: string,
  customerId: string,
  tagId: string
) {
  const { session, business, customer } = await getManagementContext(
    slug,
    customerId,
    "CUSTOMERS_EDIT"
  );
  const assignment = await prisma.customerTagAssignment.findFirst({
    where: {
      businessId: business.id,
      customerId: customer.id,
      tagId,
    },
    include: { tag: { select: { name: true } } },
  });

  if (assignment) {
    await prisma.$transaction([
      prisma.customerTagAssignment.delete({ where: { id: assignment.id } }),
      prisma.businessActivity.create({
        data: {
          type: "CUSTOMER_TAG_REMOVED",
          description: `تمت إزالة وسم العميل: ${assignment.tag.name}`,
          businessId: business.id,
          customerId: customer.id,
          createdById: session.user.id,
        },
      }),
    ]);
  }

  revalidateCustomerPages(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=tag-removed`);
}

export async function createCustomerNoteAction(
  slug: string,
  customerId: string,
  formData: FormData
) {
  const { session, business, customer } = await getManagementContext(
    slug,
    customerId,
    "CUSTOMERS_EDIT"
  );
  const parsed = customerNoteContentSchema.safeParse(formData.get("content"));

  if (!parsed.success) {
    redirect(`/businesses/${slug}/customers/${customer.id}?error=note-invalid`);
  }

  await prisma.$transaction([
    prisma.customerNote.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        content: parsed.data,
        createdById: session.user.id,
        updatedById: session.user.id,
      },
    }),
    prisma.businessActivity.create({
      data: {
        type: "CUSTOMER_NOTE_CREATED",
        description: "تمت إضافة ملاحظة داخلية للعميل",
        businessId: business.id,
        customerId: customer.id,
        createdById: session.user.id,
      },
    }),
  ]);

  revalidateCustomerPages(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=note-created`);
}

export async function updateCustomerNoteAction(
  slug: string,
  customerId: string,
  noteId: string,
  formData: FormData
) {
  const { session, business, customer } = await getManagementContext(
    slug,
    customerId,
    "CUSTOMERS_EDIT"
  );
  const parsed = customerNoteContentSchema.safeParse(formData.get("content"));

  if (!parsed.success) {
    redirect(`/businesses/${slug}/customers/${customer.id}?error=note-invalid`);
  }

  const note = await prisma.customerNote.findFirst({
    where: {
      id: noteId,
      businessId: business.id,
      customerId: customer.id,
    },
    select: { id: true },
  });

  if (!note) {
    redirect(`/businesses/${slug}/customers/${customer.id}`);
  }

  await prisma.$transaction([
    prisma.customerNote.update({
      where: { id: note.id },
      data: {
        content: parsed.data,
        updatedById: session.user.id,
      },
    }),
    prisma.businessActivity.create({
      data: {
        type: "CUSTOMER_NOTE_UPDATED",
        description: "تم تعديل ملاحظة داخلية للعميل",
        businessId: business.id,
        customerId: customer.id,
        createdById: session.user.id,
      },
    }),
  ]);

  revalidateCustomerPages(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=note-updated`);
}

export async function addLoyaltyAction(
  slug: string,
  customerId: string,
  formData: FormData
) {
  const {
    session,
    business,
    customer,
  } = await getActionContext(
    slug,
    customerId,
    "LOYALTY_EARN"
  );

  const activityContext =
    await getActivityRequestContext();

  const branchId = getOptionalOperationId(formData, "branchId");
  const attributedStaffId = getOptionalOperationId(formData, "attributedStaffId");

  let saleAmount: number | undefined;

  if (
    business.loyaltyMode ===
    "SALES_AMOUNT"
  ) {
    const parsedSale =
      saleAmountSchema.safeParse({
        saleAmount:
          formData.get(
            "saleAmount"
          ),
      });

    if (!parsedSale.success) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=sale-invalid`
      );
    }

    saleAmount = parsedSale.data.saleAmount;
  }

  const {
    amount,
    transactionNote,
    activityDescription,
  } = getEarnDetails({
    loyaltyMode: business.loyaltyMode,
    earnAmount: business.earnAmount,
    saleAmount,
    unitName: business.unitName,
  });

  const parsedOperation = financialOperationSchema.safeParse(
    formData.get("operationId")
  );

  if (!parsedOperation.success) {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=earned-invalid`
    );
  }

  const idempotencyKey = parsedOperation.data;

  const completedOperation =
    await prisma.loyaltyTransaction.findUnique({
      where: {
        businessId_idempotencyKey: {
          businessId: business.id,
          idempotencyKey,
        },
      },
      select: {
        customerId: true,
        type: true,
        amount: true,
        sourceLoyaltyMode: true,
        saleAmount: true,
        promotionApplication: {
          select: { baseAmount: true },
        },
      },
    });

  if (completedOperation) {
    const baseAmount =
      completedOperation.promotionApplication?.baseAmount ??
      completedOperation.amount;

    if (
      completedOperation.customerId !== customer.id ||
      completedOperation.type !== "EARN" ||
      completedOperation.sourceLoyaltyMode !== business.loyaltyMode ||
      completedOperation.saleAmount !== (saleAmount ?? null) ||
      baseAmount !== amount
    ) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=earned-conflict`,
      );
    }

    redirect(
      `/businesses/${slug}/customers/${customer.id}?success=earned`,
    );
  }

  const rapidEarnInput = {
    businessId: business.id,
    customerId: customer.id,
    createdById: session.user.id,
    amount,
  };

  if (!completedOperation) {
    const rapidEarnLimit = rateLimit(
      getRapidEarnRateLimitKey(rapidEarnInput),
      {
        limit: 1,
        windowMs: RAPID_EARN_WINDOW_MS,
      }
    );

    if (!rapidEarnLimit.allowed) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=earned-too-soon`
      );
    }

    const recentDuplicateEarn =
      await prisma.loyaltyTransaction.findFirst({
        where: getRapidEarnWhere(rapidEarnInput),
        select: {
          id: true,
        },
      });

    if (recentDuplicateEarn) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=earned-too-soon`
      );
    }
  }

  let newBalance: number | null;

  try {
    newBalance = await prisma.$transaction(async (transaction) => {
      const occurredAt = new Date();
      const promotions = await transaction.promotion.findMany({
        where: {
          businessId: business.id,
          isActive: true,
          AND: [
            {
              OR: [
                { startsAt: null },
                { startsAt: { lte: occurredAt } },
              ],
            },
            {
              OR: [
                { endsAt: null },
                { endsAt: { gte: occurredAt } },
              ],
            },
          ],
        },
        select: {
          id: true,
          businessId: true,
          isActive: true,
          loyaltyMode: true,
          minimumTransactionAmount: true,
          bonusAmount: true,
          bonusMultiplier: true,
          startsAt: true,
          endsAt: true,
          createdAt: true,
        },
      });
      const promotion = selectEligiblePromotion({
        businessId: business.id,
        loyaltyMode: business.loyaltyMode,
        transactionAmount: amount,
        occurredAt,
        promotions,
      });

      const balanceAfter = await recordLoyaltyEarn(transaction, {
        customerId: customer.id,
        businessId: business.id,
        actor: getFinancialActor(session),
        branchId,
        activityContext,
        attributedStaffId,
        amount,
        sourceLoyaltyMode: business.loyaltyMode,
        saleAmount,
        idempotencyKey,
        promotion: promotion
          ? {
              id: promotion.id,
              businessId: promotion.businessId,
              bonusAmount: calculatePromotionBonus(
                promotion,
                amount
              ),
            }
          : undefined,
        transactionNote,
        activityDescription,
      });

      if (balanceAfter !== null) {
        await createRewardUnlocksForEarn(transaction, {
          businessId: business.id,
          customerId: customer.id,
          createdById: session.user.id,
          balanceAfter,
        });
      }

      return balanceAfter;
    });
  } catch (error) {
    if (isFinancialOperationConflictError(error)) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=earned-conflict`,
      );
    }

    throw error;
  }

  if (newBalance === null) {
    redirect(
      `/businesses/${slug}/customers`
    );
  }

  await syncBusinessToGoogleSheetSafely(
    business.id
  );

  revalidateCustomerPages(
    slug,
    customer.id,
    customer.publicToken
  );

  redirect(
    `/businesses/${slug}/customers/${customer.id}?success=earned`
  );
}

export async function redeemRewardAction(
  slug: string,
  customerId: string,
  rewardId?: string,
  formData?: FormData,
) {
  const {
    session,
    business,
    customer,
  } = await getActionContext(
    slug,
    customerId,
    "LOYALTY_REDEEM"
  );

  const selectedReward = rewardId
    ? await prisma.reward.findFirst({
        where: {
          id: rewardId,
          businessId: business.id,
          isActive: true,
        },
          select: {
            id: true,
            name: true,
            type: true,
            code: true,
            cost: true,
            expiresAfterDays: true,
            businessId: true,
        },
      })
    : null;

  if (rewardId && !selectedReward) {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=reward-unavailable`
    );
  }

  const rewardName = selectedReward?.name ?? business.rewardName;
  const rewardLabel = getRewardLabel(
    selectedReward?.type ?? business.rewardType,
    rewardName,
    selectedReward?.code ?? business.rewardCode
  );

  const cost = selectedReward?.cost ?? business.rewardThreshold;

  const parsedOperation = financialOperationSchema.safeParse(
    formData?.get("operationId"),
  );

  if (!parsedOperation.success) {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=redemption-invalid`,
    );
  }

  const idempotencyKey = parsedOperation.data;
  const branchId = getOptionalOperationId(formData, "branchId");
  const attributedStaffId = getOptionalOperationId(formData, "attributedStaffId");

  const redemptionActivityContext =
    await getActivityRequestContext();

  const rapidRedemptionInput = {
    businessId: business.id,
    customerId: customer.id,
    createdById: session.user.id,
    cost,
  };

  const completedOperation = await prisma.loyaltyTransaction.findUnique({
    where: {
      businessId_idempotencyKey: {
        businessId: business.id,
        idempotencyKey,
      },
    },
    select: {
      customerId: true,
      type: true,
      amount: true,
      rewardRedemption: {
        select: { rewardId: true, cost: true },
      },
    },
  });

  if (completedOperation) {
    if (
      completedOperation.customerId !== customer.id ||
      completedOperation.type !== "REDEEM" ||
      completedOperation.amount !== -cost ||
      completedOperation.rewardRedemption?.rewardId !==
        (selectedReward?.id ?? null) ||
      completedOperation.rewardRedemption?.cost !== cost
    ) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=redemption-conflict`,
      );
    }

    redirect(
      `/businesses/${slug}/customers/${customer.id}?success=redeemed`,
    );
  }

  if (!completedOperation) {
    const rapidRedemptionLimit = rateLimit(
      getRapidRedemptionRateLimitKey(rapidRedemptionInput),
      {
        limit: 1,
        windowMs: RAPID_EARN_WINDOW_MS,
      }
    );

    if (!rapidRedemptionLimit.allowed) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=redeemed-too-soon`
      );
    }

    const recentDuplicateRedemption =
      await prisma.loyaltyTransaction.findFirst({
        where: getRapidRedemptionWhere(
          rapidRedemptionInput
        ),
        select: {
          id: true,
        },
      });

    if (recentDuplicateRedemption) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=redeemed-too-soon`
      );
    }
  }

  const redemption = await prisma.$transaction(
    async (transaction) => {
      const now = new Date();
      let unlockId: string | null = null;

      if (selectedReward?.expiresAfterDays) {
        const unlock = await transaction.rewardUnlock.findFirst({
          where: {
            businessId: business.id,
            customerId: customer.id,
            rewardId: selectedReward.id,
            redeemedAt: null,
          },
          orderBy: { unlockedAt: "desc" },
        });

        // No unlock means this balance predates enabling expiry, so preserve
        // backward-compatible redemption behavior for existing customers.
        if (unlock) {
          const unlockState = getRewardUnlockRedemptionState({
            expectedBusinessId: business.id,
            unlockBusinessId: unlock.businessId,
            rewardBusinessId: selectedReward.businessId,
            expiresAt: unlock.expiresAt,
            redeemedAt: unlock.redeemedAt,
            expiredAt: unlock.expiredAt,
            now,
          });

          if (unlockState !== "ACTIVE") {
            if (!unlock.expiredAt) {
              await transaction.rewardUnlock.updateMany({
                where: {
                  id: unlock.id,
                  businessId: business.id,
                  customerId: customer.id,
                  rewardId: selectedReward.id,
                  redeemedAt: null,
                  expiredAt: null,
                  expiresAt: { lte: now },
                },
                data: { expiredAt: now },
              });
              await transaction.businessActivity.create({
                data: {
                  type: "REWARD_EXPIRED",
                  description: `انتهت صلاحية ${selectedReward.name}`,
                  businessId: business.id,
                  customerId: customer.id,
                  createdById: session.user.id,
                },
              });
            }

            await transaction.businessActivity.create({
              data: {
                type: "REWARD_REDEMPTION_BLOCKED",
                description: `تم رفض استبدال ${selectedReward.name} لانتهاء الصلاحية`,
                businessId: business.id,
                customerId: customer.id,
                createdById: session.user.id,
              },
            });
            return { balance: null, expired: true };
          }

          unlockId = unlock.id;
        }
      }

      const balance = await recordRewardRedemption(transaction, {
          customerId: customer.id,
          businessId: business.id,
          actor: getFinancialActor(session),
          branchId,
          attributedStaffId,
          activityContext: redemptionActivityContext,
          cost,
          rewardLabel,
          rewardName,
          rewardId: selectedReward?.id,
          ...(unlockId ? { unlockId } : {}),
          idempotencyKey,
        });

      return { balance, expired: false };
    },
  ).catch((error: unknown) => {
    if (isFinancialOperationConflictError(error)) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=redemption-conflict`,
      );
    }

    if (isFinancialOperationAbortedError(error)) {
      return { balance: null, expired: false };
    }

    throw error;
  });

  if (redemption.expired) {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=reward-expired`
    );
  }

  if (redemption.balance === null) {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=not-enough`
    );
  }

  await syncBusinessToGoogleSheetSafely(
    business.id
  );

  revalidateCustomerPages(
    slug,
    customer.id,
    customer.publicToken
  );

  redirect(
    `/businesses/${slug}/customers/${customer.id}?success=redeemed`
  );
}
