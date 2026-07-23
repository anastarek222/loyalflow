"use server";

import {
  generateCustomerCode,
  getCustomerDisplayName,
  parseCustomerRegistration,
} from "@/lib/customers/registration";
import {
  canRecordReferral,
  normalizeReferralCode,
} from "@/lib/referrals/code";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import prisma from "@/lib/prisma";
import {
  getClientAddress,
  rateLimit,
} from "@/lib/utils/rate-limiter";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function joinBusinessAction(
  slug: string,
  formData: FormData
) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      isActive: true,
    },
  });

  if (!business?.isActive) {
    redirect(`/join/${slug}?error=unavailable`);
  }

  const requestHeaders = await headers();
  const clientAddress = getClientAddress(requestHeaders);
  const limit = rateLimit(
    `public-join:${business.id}:${clientAddress}`,
    {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    }
  );

  if (!limit.allowed) {
    redirect(`/join/${business.slug}?error=rate-limit`);
  }

  const parsed = parseCustomerRegistration({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
  });

  if (!parsed) {
    redirect(`/join/${business.slug}?error=invalid`);
  }

  const existingCustomer = await prisma.customer.findUnique({
    where: {
      businessId_phone: {
        businessId: business.id,
        phone: parsed.phone,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingCustomer) {
    redirect(`/join/${business.slug}?error=duplicate`);
  }

  const customerCode = await generateCustomerCode(
    prisma,
    business.id,
    business.slug
  );
  const customerName = getCustomerDisplayName(parsed);
  const referralCode = normalizeReferralCode(
    formData.get("ref")
  );

  try {
    const customer = await prisma.$transaction(
      async (transaction) => {
        const createdCustomer = await transaction.customer.create({
          data: {
            firstName: parsed.firstName,
            lastName: parsed.lastName || null,
            phone: parsed.phone,
            customerCode,
            businessId: business.id,
          },
        });

        await transaction.businessActivity.create({
          data: {
            type: "CUSTOMER_CREATED",
            description: `انضم العميل ${customerName} عبر التسجيل الذاتي`,
            businessId: business.id,
            customerId: createdCustomer.id,
          },
        });

        if (referralCode) {
          const referrerCode =
            await transaction.customerReferralCode.findFirst({
              where: {
                businessId: business.id,
                code: referralCode,
                isActive: true,
                customer: {
                  isActive: true,
                },
              },
              select: {
                customerId: true,
                businessId: true,
                customer: {
                  select: {
                    isActive: true,
                  },
                },
              },
            });

          if (
            referrerCode &&
            canRecordReferral({
              businessId: business.id,
              referrerBusinessId: referrerCode.businessId,
              referrerCustomerId: referrerCode.customerId,
              referredCustomerId: createdCustomer.id,
              referrerIsActive: referrerCode.customer.isActive,
            })
          ) {
            await transaction.referral.create({
              data: {
                businessId: business.id,
                referrerCustomerId: referrerCode.customerId,
                referredCustomerId: createdCustomer.id,
              },
            });
            await transaction.businessActivity.create({
              data: {
                type: "REFERRAL_RECORDED",
                description: "تم تسجيل إحالة عميل جديد",
                businessId: business.id,
                customerId: createdCustomer.id,
              },
            });
          }
        }

        return createdCustomer;
      }
    );

    await syncBusinessToGoogleSheetSafely(business.id);

    revalidatePath(`/businesses/${business.slug}`);
    revalidatePath(`/businesses/${business.slug}/customers`);
    revalidatePath(`/card/${customer.publicToken}`);

    redirect(`/card/${customer.publicToken}?welcome=1`);
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      redirect(`/join/${business.slug}?error=duplicate`);
    }

    throw error;
  }
}
