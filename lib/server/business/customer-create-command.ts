import type { PublicMembershipRegistration } from "@loyalflow/contracts/customers/public-membership";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import { createPublicCardToken } from "@/lib/customers/public-card-token";
import {
  generateCustomerCode,
  getCustomerDisplayName,
} from "@/lib/customers/registration";
import { isWithinPlanLimit } from "@/lib/entitlements";
import { configurationToPlanLimits } from "@/lib/entitlements-server";
import prisma from "@/lib/prisma";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";

export type CustomerCreateActor = Readonly<{
  id: string;
  businessId: string | null;
  email?: string | null;
}>;

type CustomerCreateFailure = Readonly<{
  ok: false;
  reason:
    | "BUSINESS_NOT_FOUND"
    | "DUPLICATE"
    | "PLAN_LIMIT"
    | "SUBSCRIPTION_RESTRICTED";
}>;

type CreatedCustomer = Readonly<{
  id: string;
  publicToken: string;
}>;

export type CustomerCreateCommandResult =
  | Readonly<{
      ok: true;
      customer: CreatedCustomer;
      integrationJobId: string;
    }>
  | CustomerCreateFailure;

/**
 * Authoritative Customer creation boundary.
 *
 * The caller keeps authentication, tenant authorization, input parsing,
 * presentation preflight, redirects, revalidation and post-commit transport
 * wake-up. This command owns persisted duplicate/plan/subscription checks and
 * atomically commits Customer + business activity + Sheets integration job.
 */
export async function createCustomerCommand(input: {
  businessId: string;
  customer: PublicMembershipRegistration;
  actor: CustomerCreateActor;
}): Promise<CustomerCreateCommandResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    const business = await transaction.business.findUnique({
      where: { id: input.businessId },
      select: { plan: true, slug: true },
    });
    if (!business) {
      return { ok: false, reason: "BUSINESS_NOT_FOUND" } as const;
    }

    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "EXPAND",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
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
    const customerName = getCustomerDisplayName(input.customer);
    const customer = await transaction.customer.create({
      data: {
        firstName: input.customer.firstName,
        lastName: input.customer.lastName || null,
        phone: input.customer.phone,
        customerCode,
        businessId: input.businessId,
        publicToken: createPublicCardToken(),
      },
      select: { id: true, publicToken: true },
    });

    const activity = await transaction.businessActivity.create({
      data: {
        type: "CUSTOMER_CREATED",
        description: `تم إنشاء العميل ${customerName}`,
        businessId: input.businessId,
        customerId: customer.id,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
      select: { id: true },
    });
    const integrationJob = await enqueueIntegrationJob(transaction, {
      businessId: input.businessId,
      kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
      idempotencyKey: `customer-created:${activity.id}`,
    });

    return {
      ok: true,
      customer,
      integrationJobId: integrationJob.id,
    } as const;
  });
}
