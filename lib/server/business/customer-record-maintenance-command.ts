import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import prisma from "@/lib/prisma";

export type CustomerRecordMaintenanceActor = Readonly<{
  id: string;
  businessId: string | null;
  email?: string | null;
}>;

type CustomerRecordMaintenanceFailure = Readonly<{
  ok: false;
  reason: "DUPLICATE" | "SUBSCRIPTION_RESTRICTED" | "TARGET_NOT_FOUND";
}>;

export type CustomerRecordMaintenanceResult =
  | Readonly<{ ok: true }>
  | CustomerRecordMaintenanceFailure;

/**
 * Authoritative Customer profile-maintenance boundary.
 *
 * The caller retains authentication, permission checks, input parsing,
 * presentation preflight, redirects, revalidation, and post-commit
 * integrations. This command revalidates persisted lifecycle state, tenant
 * ownership and phone uniqueness before committing the Customer + audit write.
 */
export async function updateCustomerRecordCommand(input: {
  businessId: string;
  customerId: string;
  firstName: string;
  lastName?: string;
  phone: string;
  actor: CustomerRecordMaintenanceActor;
}): Promise<CustomerRecordMaintenanceResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const customer = await transaction.customer.findFirst({
      where: { id: input.customerId, businessId: input.businessId },
      select: { id: true },
    });
    if (!customer) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    const duplicateCustomer = await transaction.customer.findFirst({
      where: {
        businessId: input.businessId,
        phone: input.phone,
        id: { not: customer.id },
      },
      select: { id: true },
    });
    if (duplicateCustomer) {
      return { ok: false, reason: "DUPLICATE" } as const;
    }

    await transaction.customer.update({
      where: { id: customer.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName || null,
        phone: input.phone,
      },
    });

    const updatedCustomerName = [input.firstName, input.lastName]
      .filter(Boolean)
      .join(" ");
    await transaction.businessActivity.create({
      data: {
        type: "CUSTOMER_UPDATED",
        description: `تم تحديث بيانات العميل ${updatedCustomerName}`,
        businessId: input.businessId,
        customerId: customer.id,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
    });

    return { ok: true } as const;
  });
}

/**
 * Authoritative Customer status-maintenance boundary.
 *
 * Reactivation remains an OPERATE action and therefore rechecks persisted
 * lifecycle state. Deactivation deliberately remains available as a security
 * exit control. Tenant ownership, status mutation, and audit are atomic.
 */
export async function setCustomerRecordStatusCommand(input: {
  businessId: string;
  customerId: string;
  isActive: boolean;
  actor: CustomerRecordMaintenanceActor;
}): Promise<CustomerRecordMaintenanceResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    const customer = await transaction.customer.findFirst({
      where: { id: input.customerId, businessId: input.businessId },
      select: { id: true },
    });
    if (!customer) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    if (
      input.isActive &&
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    await transaction.customer.update({
      where: { id: customer.id },
      data: { isActive: input.isActive },
    });

    await transaction.businessActivity.create({
      data: {
        type: input.isActive ? "CUSTOMER_REACTIVATED" : "CUSTOMER_DEACTIVATED",
        description: input.isActive
          ? "تم إعادة تفعيل حساب العميل"
          : "تم إيقاف حساب العميل",
        businessId: input.businessId,
        customerId: customer.id,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
    });

    return { ok: true } as const;
  });
}
