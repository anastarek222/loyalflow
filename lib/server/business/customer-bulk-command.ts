import { randomUUID } from "node:crypto";

import {
  getBulkStateChangeIds,
  type BulkCustomerOperation,
} from "@/lib/customers/bulk";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import prisma from "@/lib/prisma";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";

export type CustomerBulkActor = Readonly<{
  id: string;
  businessId: string | null;
  email?: string | null;
}>;

type CustomerBulkFailure = Readonly<{
  ok: false;
  reason: "INVALID_SELECTION" | "INVALID_TAG" | "SUBSCRIPTION_RESTRICTED";
}>;

export type CustomerBulkCommandResult =
  | Readonly<{
      ok: true;
      changedIds: readonly string[];
      integrationJobId: string;
    }>
  | CustomerBulkFailure;

type TagOperation = Extract<BulkCustomerOperation, "ADD_TAG" | "REMOVE_TAG">;

async function enqueueBulkSheetsSync(
  transaction: Parameters<typeof enqueueIntegrationJob>[0],
  businessId: string,
  scope: "status" | "tag",
) {
  return enqueueIntegrationJob(transaction, {
    businessId,
    kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
    idempotencyKey: `customer-bulk-${scope}:${randomUUID()}`,
  });
}

export async function setBulkCustomerStatusCommand(input: {
  businessId: string;
  customerIds: readonly string[];
  activate: boolean;
  actor: CustomerBulkActor;
}): Promise<CustomerBulkCommandResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    const customers = await transaction.customer.findMany({
      where: { businessId: input.businessId, id: { in: [...input.customerIds] } },
      select: { id: true, businessId: true, isActive: true },
    });
    const changedIds = getBulkStateChangeIds(
      customers,
      input.businessId,
      input.customerIds,
      input.activate,
    );
    if (!changedIds) {
      return { ok: false, reason: "INVALID_SELECTION" } as const;
    }
    if (changedIds.length === 0) {
      const integrationJob = await enqueueBulkSheetsSync(
        transaction,
        input.businessId,
        "status",
      );
      return {
        ok: true,
        changedIds,
        integrationJobId: integrationJob.id,
      } as const;
    }

    if (
      input.activate &&
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const updated = await transaction.customer.updateMany({
      where: { businessId: input.businessId, id: { in: changedIds } },
      data: { isActive: input.activate },
    });
    if (updated.count !== changedIds.length) {
      throw new Error(
        "Bulk customer status update did not affect every selected customer.",
      );
    }

    await transaction.businessActivity.createMany({
      data: changedIds.map((customerId) => ({
        type: input.activate ? "CUSTOMER_REACTIVATED" : "CUSTOMER_DEACTIVATED",
        description: input.activate
          ? "تمت إعادة تفعيل العميل عبر عملية جماعية"
          : "تم إيقاف العميل عبر عملية جماعية",
        businessId: input.businessId,
        customerId,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      })),
    });
    const integrationJob = await enqueueBulkSheetsSync(
      transaction,
      input.businessId,
      "status",
    );

    return {
      ok: true,
      changedIds,
      integrationJobId: integrationJob.id,
    } as const;
  });
}

export async function mutateBulkCustomerTagCommand(input: {
  businessId: string;
  customerIds: readonly string[];
  tagId: string;
  operation: TagOperation;
  actor: CustomerBulkActor;
}): Promise<CustomerBulkCommandResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    const customers = await transaction.customer.findMany({
      where: { businessId: input.businessId, id: { in: [...input.customerIds] } },
      select: { id: true },
    });
    if (customers.length !== input.customerIds.length) {
      return { ok: false, reason: "INVALID_SELECTION" } as const;
    }

    const tag = await transaction.customerTag.findFirst({
      where: { id: input.tagId, businessId: input.businessId },
      select: { id: true, name: true },
    });
    if (!tag) {
      return { ok: false, reason: "INVALID_TAG" } as const;
    }

    const existingAssignments = await transaction.customerTagAssignment.findMany({
      where: {
        businessId: input.businessId,
        tagId: tag.id,
        customerId: { in: [...input.customerIds] },
      },
      select: { id: true, customerId: true },
    });
    const existingCustomerIds = new Set(
      existingAssignments.map((assignment) => assignment.customerId),
    );
    const changedIds =
      input.operation === "ADD_TAG"
        ? input.customerIds.filter(
            (customerId) => !existingCustomerIds.has(customerId),
          )
        : existingAssignments.map((assignment) => assignment.customerId);

    if (changedIds.length === 0) {
      const integrationJob = await enqueueBulkSheetsSync(
        transaction,
        input.businessId,
        "tag",
      );
      return {
        ok: true,
        changedIds,
        integrationJobId: integrationJob.id,
      } as const;
    }

    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    if (input.operation === "ADD_TAG") {
      const added = await transaction.customerTagAssignment.createMany({
        data: changedIds.map((customerId) => ({
          businessId: input.businessId,
          customerId,
          tagId: tag.id,
        })),
      });
      if (added.count !== changedIds.length) {
        throw new Error(
          "Bulk tag assignment did not affect every expected customer.",
        );
      }
    } else {
      const removed = await transaction.customerTagAssignment.deleteMany({
        where: {
          businessId: input.businessId,
          tagId: tag.id,
          customerId: { in: changedIds },
        },
      });
      if (removed.count !== changedIds.length) {
        throw new Error(
          "Bulk tag removal did not affect every expected assignment.",
        );
      }
    }

    await transaction.businessActivity.createMany({
      data: changedIds.map((customerId) => ({
        type:
          input.operation === "ADD_TAG"
            ? "CUSTOMER_TAG_ASSIGNED"
            : "CUSTOMER_TAG_REMOVED",
        description:
          input.operation === "ADD_TAG"
            ? `تمت إضافة وسم العميل عبر عملية جماعية: ${tag.name}`
            : `تمت إزالة وسم العميل عبر عملية جماعية: ${tag.name}`,
        businessId: input.businessId,
        customerId,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      })),
    });
    const integrationJob = await enqueueBulkSheetsSync(
      transaction,
      input.businessId,
      "tag",
    );

    return {
      ok: true,
      changedIds,
      integrationJobId: integrationJob.id,
    } as const;
  });
}
