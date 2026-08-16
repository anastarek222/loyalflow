import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  generateCustomerCode,
  getCustomerDisplayName,
} from "@/lib/customers/registration";
import { isWithinPlanLimit } from "@/lib/entitlements";
import { configurationToPlanLimits } from "@/lib/entitlements-server";
import prisma from "@/lib/prisma";

export type CustomerCreateActor = Readonly<{
  id: string;
  businessId: string | null;
  email?: string | null;
}>;

export type CustomerCreateInput = Readonly<{
  firstName: string;
  lastName?: string | null;
  phone: string;
}>;

type CustomerCreateFailure = Readonly<{
  ok: false;
  reason:
    | "BUSINESS_NOT_FOUND"
    | "DUPLICATE"
    | "SUBSCRIPTION_RESTRICTED"
    | "PLAN_LIMIT";
}>;

export type CustomerCreateCommandResult =
  | Readonly<{ ok: true; customerId: string; publicToken: string }>
  | CustomerCreateFailure;

/**
 * Authoritative Customer creation boundary.
 *
 * The caller keeps authentication, tenant authorization, input parsing,
 * presentation duplicate/plan preflight, redirects, revalidation and external
 * Google Sheets sync. This command owns persisted subscription/tenant/plan
 * checks plus the atomic Customer + business activity write.
 */
export async function createCustomerCommand(input: {
  businessId: string;
  customer: CustomerCreateInput;
  actor: CustomerCreateActor;
}): Promise<CustomerCreateCommandResult> {
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
      select: { slug: true, plan: true },
    });
    if (!business) {
      return { ok: false, reason: "BUSINESS_NOT_FOUND" } as const;
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
      !isWithinPlanLimit(
        business.plan,
        "CUSTOMERS",
        customerCount,
        1,
        planLimits,
      )
    ) {
      return { ok: false, reason: "PLAN_LIMIT" } as const;
    }

    const customerCode = await generateCustomerCode(
      transaction,
      input.businessId,
      business.slug,
    );
    const customer = await transaction.customer.create({
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
        description: `تم إنشاء العميل ${getCustomerDisplayName(input.customer)}`,
        businessId: input.businessId,
        customerId: customer.id,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
    });

    return {
      ok: true,
      customerId: customer.id,
      publicToken: customer.publicToken,
    } as const;
  });
}
