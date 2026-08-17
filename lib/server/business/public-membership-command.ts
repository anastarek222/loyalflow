import type { PublicMembershipRegistration } from "@loyalflow/contracts/customers/public-membership";

import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  generateCustomerCode,
  getCustomerDisplayName,
} from "@/lib/customers/registration";
import {
  canApplyPublicReferral,
  canCreatePublicMembership,
} from "@/lib/customers/public-membership-policy";
import { configurationToPlanLimits } from "@/lib/entitlements-server";
import prisma from "@/lib/prisma";
import { canRecordReferral } from "@/lib/referrals/code";

type PublicMembershipFailure = Readonly<{
  ok: false;
  reason: "BUSINESS_UNAVAILABLE" | "DUPLICATE" | "PLAN_LIMIT";
}>;

export type PublicMembershipCommandResult =
  | Readonly<{
      ok: true;
      customer: Readonly<{ id: string; publicToken: string }>;
    }>
  | PublicMembershipFailure;

/**
 * Authoritative public membership persistence boundary.
 *
 * The public Server Action keeps transport validation, rate limiting,
 * presentation preflight, redirects, revalidation and post-commit integrations.
 * This command owns the serializable tenant/customer/referral write transaction.
 */
export async function createPublicMembershipCommand(input: {
  businessId: string;
  customer: PublicMembershipRegistration;
  referralCode: string | null;
}): Promise<PublicMembershipCommandResult> {
  return prisma.$transaction(
    async (transaction) => {
      const business = await transaction.business.findUnique({
        where: { id: input.businessId },
        select: {
          isActive: true,
          plan: true,
          slug: true,
        },
      });
      if (!business?.isActive) {
        return { ok: false, reason: "BUSINESS_UNAVAILABLE" } as const;
      }

      if (
        !(await canBusinessPerformSubscriptionOperation(
          transaction,
          input.businessId,
          "EXPAND",
        ))
      ) {
        return { ok: false, reason: "BUSINESS_UNAVAILABLE" } as const;
      }

      const existingCustomer = await transaction.customer.findUnique({
        where: {
          businessId_phone: {
            businessId: input.businessId,
            phone: input.customer.phone,
          },
        },
        select: { id: true },
      });
      if (existingCustomer) {
        return { ok: false, reason: "DUPLICATE" } as const;
      }

      const [configuration, customerCount] = await Promise.all([
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
        transaction.customer.count({ where: { businessId: input.businessId } }),
      ]);
      const planLimits = configurationToPlanLimits(configuration, business.plan);
      if (
        !canCreatePublicMembership(business.plan, customerCount, planLimits)
      ) {
        return { ok: false, reason: "PLAN_LIMIT" } as const;
      }

      const customerCode = await generateCustomerCode(
        transaction,
        input.businessId,
        business.slug,
      );
      const createdCustomer = await transaction.customer.create({
        data: {
          firstName: input.customer.firstName,
          lastName: input.customer.lastName || null,
          phone: input.customer.phone,
          customerCode,
          businessId: input.businessId,
        },
        select: { id: true, publicToken: true },
      });

      await transaction.businessActivity.create({
        data: {
          type: "CUSTOMER_CREATED",
          description: `انضم العميل ${getCustomerDisplayName(input.customer)} عبر التسجيل الذاتي`,
          businessId: input.businessId,
          customerId: createdCustomer.id,
        },
      });

      if (input.referralCode && canApplyPublicReferral(business.plan)) {
        const referrerCode = await transaction.customerReferralCode.findFirst({
          where: {
            businessId: input.businessId,
            code: input.referralCode,
            isActive: true,
            customer: { isActive: true },
          },
          select: {
            customerId: true,
            businessId: true,
            customer: { select: { isActive: true } },
          },
        });

        if (
          referrerCode &&
          canRecordReferral({
            businessId: input.businessId,
            referrerBusinessId: referrerCode.businessId,
            referrerCustomerId: referrerCode.customerId,
            referredCustomerId: createdCustomer.id,
            referrerIsActive: referrerCode.customer.isActive,
          })
        ) {
          await transaction.referral.create({
            data: {
              businessId: input.businessId,
              referrerCustomerId: referrerCode.customerId,
              referredCustomerId: createdCustomer.id,
            },
          });
          await transaction.businessActivity.create({
            data: {
              type: "REFERRAL_RECORDED",
              description: "تم تسجيل إحالة عميل جديد",
              businessId: input.businessId,
              customerId: createdCustomer.id,
            },
          });
        }
      }

      return { ok: true, customer: createdCustomer } as const;
    },
    { isolationLevel: "Serializable" },
  );
}
