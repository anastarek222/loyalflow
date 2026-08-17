import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import prisma from "@/lib/prisma";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";

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
  | Readonly<{ ok: true; integrationJobId: string }>
  | CustomerRecordMaintenanceFailure;

/**
 * Authoritative Customer profile-maintenance boundary.
 *
 * The caller retains authentication, permission checks, input parsing,
 * presentation preflight, redirects, revalidation, and post-commit transport
 * wake-up. This command revalidates persisted lifecycle state, tenant ownership
 * and phone uniqueness before atomically committing the Customer + audit +
 * Google Sheets integration-job write.
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
    const activity = await transaction.businessActivity.create({
      data: {
        type: "CUSTOMER_UPDATED",
        description: `تم تحديث بيانات العميل ${updatedCustomerName}`,
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
      idempotencyKey: `customer-record-updated:${activity.id}`,
    });

    return { ok: true, integrationJobId: integrationJob.id } as const;
  });
}

/**
 * Authoritative Customer status-maintenance boundary.
 *
 * Reactivation remains an OPERATE action and therefore rechecks persisted
 * lifecycle state. Deactivation deliberately remains available as a security
 * exit control. Tenant ownership, status mutation, audit and integration-job
 * enqueue are atomic.
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

    const activity = await transaction.businessActivity.create({
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
      select: { id: true },
    });
    const integrationJob = await enqueueIntegrationJob(transaction, {
      businessId: input.businessId,
      kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
      idempotencyKey: `customer-record-status:${activity.id}`,
    });

    return { ok: true, integrationJobId: integrationJob.id } as const;
  });
}
