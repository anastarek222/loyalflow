"use server";

import {
  publicMembershipRegistrationProblemCodes,
} from "@loyalflow/contracts/customers/public-membership";

import {
  generateCustomerCode,
  getCustomerDisplayName,
  parseCustomerRegistration,
} from "@/lib/customers/registration";
import {
  canApplyPublicReferral,
  canCreatePublicMembership,
} from "@/lib/customers/public-membership-policy";
import { getEffectivePlanLimits } from "@/lib/entitlements-server";
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

class PublicMembershipPlanLimitError extends Error {}

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
      plan: true,
    },
  });

  if (!business?.isActive) {
    redirect(
      `/join/${slug}?error=${publicMembershipRegistrationProblemCodes.businessUnavailable}`
    );
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
    redirect(
      `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.rateLimited}`
    );
  }

  const parsed = parseCustomerRegistration({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
  });

  if (!parsed) {
    redirect(
      `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.invalidInput}`
    );
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
    redirect(
      `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.duplicateMembership}`
    );
  }

  const customerCode = await generateCustomerCode(
    prisma,
    business.id,
    business.slug
  );
  const customerName = getCustomerDisplayName(parsed);
  const planLimits = await getEffectivePlanLimits(business.plan);
  const referralCode = canApplyPublicReferral(business.plan)
    ? normalizeReferralCode(formData.get("ref"))
    : null;

  try {
    const customer = await prisma.$transaction(
      async (transaction) => {
        const customerCount = await transaction.customer.count({
          where: { businessId: business.id },
        });

        if (
          !canCreatePublicMembership(
            business.plan,
            customerCount,
            planLimits
          )
        ) {
          throw new PublicMembershipPlanLimitError();
        }

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
      },
      { isolationLevel: "Serializable" }
    );

    await syncBusinessToGoogleSheetSafely(business.id);

    revalidatePath(`/businesses/${business.slug}`);
    revalidatePath(`/businesses/${business.slug}/customers`);
    revalidatePath(`/card/${customer.publicToken}`);

    redirect(`/card/${customer.publicToken}?welcome=1`);
  } catch (error) {
    if (error instanceof PublicMembershipPlanLimitError) {
      redirect(
        `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.customerLimitReached}`
      );
    }

    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      redirect(
        `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.duplicateMembership}`
      );
    }

    // Redirect errors are control flow. Every other failure gets a bounded
    // public state rather than exposing database or integration details.
    if (
      typeof error === "object" &&
      error &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    redirect(
      `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.businessUnavailable}`
    );
  }
}
