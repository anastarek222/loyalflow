"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

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
                  
    },
  });

  if (!business) {
    redirect("/businesses");
  }

  const canAccess =
    session.user.role === "SUPER_ADMIN" ||
    session.user.businessId === business.id;

  if (!canAccess) {
    redirect("/dashboard");
  }

  return {
    session,
    business,
  };
}

async function getActionContext(
  slug: string,
  customerId: string
) {
  const { session, business } =
    await getBusinessAccess(slug);

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
  customerId: string
) {
  const { session, business } =
    await getBusinessAccess(slug);

  const canManage =
    session.user.role === "SUPER_ADMIN" ||
    (session.user.role === "OWNER" &&
      session.user.businessId === business.id);

  if (!canManage) {
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
    customerId
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

  const signedAmount =
    parsed.data.direction === "ADD"
      ? parsed.data.amount
      : -parsed.data.amount;

  const newBalance =
    await prisma.$transaction(
      async (transaction) => {
        const updateResult =
          await transaction.customer.updateMany({
            where: {
              id: customer.id,
              isActive: true,

              ...(parsed.data.direction ===
              "SUBTRACT"
                ? {
                    balance: {
                      gte: parsed.data.amount,
                    },
                  }
                : {}),
            },

            data: {
              balance:
                parsed.data.direction === "ADD"
                  ? {
                      increment:
                        parsed.data.amount,
                    }
                  : {
                      decrement:
                        parsed.data.amount,
                    },
            },
          });

        if (updateResult.count !== 1) {
          return null;
        }

        const updatedCustomer =
          await transaction.customer.findUnique({
            where: {
              id: customer.id,
            },
            select: {
              balance: true,
            },
          });

        if (!updatedCustomer) {
          return null;
        }

        await transaction.loyaltyTransaction.create({
          data: {
            type: "ADJUSTMENT",
            amount: signedAmount,
            balanceAfter:
              updatedCustomer.balance,
            note:
              `تعديل يدوي: ${parsed.data.reason}`,
            customerId: customer.id,
            businessId: business.id,
            createdById: session.user.id,
          },
        });

        await transaction.businessActivity.create({
          data: {
            type: "BALANCE_ADJUSTED",
            description:
              `تم تعديل الرصيد بمقدار ${
                signedAmount > 0 ? "+" : ""
              }${signedAmount}. السبب: ${parsed.data.reason}`,
            businessId: business.id,
            customerId: customer.id,
            createdById: session.user.id,
          },
        });

        return updatedCustomer.balance;
      }
    );

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
    customerId
  );

  let amount =
    business.earnAmount;

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

    amount =
      parsedSale.data.saleAmount;
  }

  const transactionNote =
    business.loyaltyMode ===
    "SALES_AMOUNT"
      ? `Sale recorded: ${amount} ${business.unitName}`
      : "Loyalty credit added";

  const activityDescription =
    business.loyaltyMode ===
    "SALES_AMOUNT"
      ? `Recorded sale amount ${amount} ${business.unitName}`
      : `Added ${amount} loyalty credit`;

  const newBalance =
    await prisma.$transaction(
      async (transaction) => {
        const updateResult =
          await transaction.customer.updateMany({
            where: {
              id: customer.id,
              isActive: true,
            },
            data: {
              balance: {
                increment: amount,
              },
              lifetimeEarned: {
                increment: amount,
              },
            },
          });

        if (updateResult.count !== 1) {
          return null;
        }

        const updatedCustomer =
          await transaction.customer.findUnique({
            where: {
              id: customer.id,
            },
            select: {
              balance: true,
            },
          });

        if (!updatedCustomer) {
          return null;
        }

        await transaction.loyaltyTransaction.create({
          data: {
            type: "EARN",
            amount,
            balanceAfter:
              updatedCustomer.balance,
            note: transactionNote,
            customerId: customer.id,
            businessId: business.id,
            createdById: session.user.id,
          },
        });

        await transaction.businessActivity.create({
          data: {
            type: "LOYALTY_EARNED",
            description: activityDescription,
            businessId: business.id,
            customerId: customer.id,
            createdById: session.user.id,
          },
        });

        return updatedCustomer.balance;
      }
    );

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
  customerId: string
) {
  const {
    session,
    business,
    customer,
  } = await getActionContext(
    slug,
    customerId
  );

  const rewardLabel: string =
    business.rewardType ===
      "PROMO_CODE" &&
    business.rewardCode
      ? `${business.rewardName} — ${business.rewardCode}`
      : business.rewardName;

  const cost = business.rewardThreshold;

  const newBalance =
    await prisma.$transaction(
      async (transaction) => {
        const updateResult =
          await transaction.customer.updateMany({
            where: {
              id: customer.id,
              isActive: true,
              balance: {
                gte: cost,
              },
            },
            data: {
              balance: {
                decrement: cost,
              },
              lifetimeRedeemed: {
                increment: cost,
              },
            },
          });

        if (updateResult.count !== 1) {
          return null;
        }

        const updatedCustomer =
          await transaction.customer.findUnique({
            where: {
              id: customer.id,
            },
            select: {
              balance: true,
            },
          });

        if (!updatedCustomer) {
          return null;
        }

        await transaction.loyaltyTransaction.create({
          data: {
            type: "REDEEM",
            amount: -cost,
            balanceAfter:
              updatedCustomer.balance,
            note: rewardLabel,
            customerId: customer.id,
            businessId: business.id,
            createdById: session.user.id,
          },
        });

        await transaction.rewardRedemption.create({
          data: {
            rewardName: rewardLabel,
            cost,
            customerId: customer.id,
            businessId: business.id,
            createdById: session.user.id,
          },
        });

        await transaction.businessActivity.create({
          data: {
            type: "REWARD_REDEEMED",
            description:
              `تم استبدال ${business.rewardName} مقابل ${cost}`,
            businessId: business.id,
            customerId: customer.id,
            createdById: session.user.id,
          },
        });

        return updatedCustomer.balance;
      }
    );

  if (newBalance === null) {
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
