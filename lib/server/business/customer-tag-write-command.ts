import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import prisma from "@/lib/prisma";

type CustomerTagWriteFailure = Readonly<{
  ok: false;
  reason: "INVALID_TAG" | "SUBSCRIPTION_RESTRICTED" | "TARGET_NOT_FOUND";
}>;

export type CustomerTagWriteResult =
  | Readonly<{ ok: true; changed: boolean }>
  | CustomerTagWriteFailure;

async function findTenantCustomer(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  businessId: string,
  customerId: string,
) {
  return transaction.customer.findFirst({
    where: { id: customerId, businessId },
    select: { id: true },
  });
}

/**
 * Authoritative create-or-assign Customer tag boundary.
 *
 * Creating a new tag is EXPAND. Assigning an existing tag is OPERATE. Existing
 * assignments converge as a no-op before entitlement enforcement. Customer and
 * tag topology are tenant scoped inside the write transaction.
 */
export async function createAndAssignCustomerTagCommand(input: {
  businessId: string;
  customerId: string;
  tagName: string;
  actorId: string;
}): Promise<CustomerTagWriteResult> {
  return prisma.$transaction(async (transaction) => {
    const customer = await findTenantCustomer(
      transaction,
      input.businessId,
      input.customerId,
    );
    if (!customer) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    const existingTag = await transaction.customerTag.findUnique({
      where: {
        businessId_name: {
          businessId: input.businessId,
          name: input.tagName,
        },
      },
      select: { id: true, name: true },
    });

    const existingAssignment = existingTag
      ? await transaction.customerTagAssignment.findUnique({
          where: {
            customerId_tagId: {
              customerId: customer.id,
              tagId: existingTag.id,
            },
          },
          select: { id: true },
        })
      : null;
    if (existingAssignment) {
      return { ok: true, changed: false } as const;
    }

    const intent = existingTag ? "OPERATE" : "EXPAND";
    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        intent,
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const tag =
      existingTag ??
      (await transaction.customerTag.upsert({
        where: {
          businessId_name: {
            businessId: input.businessId,
            name: input.tagName,
          },
        },
        create: { businessId: input.businessId, name: input.tagName },
        update: {},
        select: { id: true, name: true },
      }));

    const added = await transaction.customerTagAssignment.createMany({
      data: [
        {
          businessId: input.businessId,
          customerId: customer.id,
          tagId: tag.id,
        },
      ],
      skipDuplicates: true,
    });
    if (added.count > 0) {
      await transaction.businessActivity.create({
        data: {
          type: "CUSTOMER_TAG_ASSIGNED",
          description: `تمت إضافة وسم العميل: ${tag.name}`,
          businessId: input.businessId,
          customerId: customer.id,
          createdById: input.actorId,
        },
      });
    }

    return { ok: true, changed: added.count > 0 } as const;
  });
}

/** Assign an existing tenant tag to a Customer, preserving no-op replay. */
export async function assignCustomerTagCommand(input: {
  businessId: string;
  customerId: string;
  tagId: string;
  actorId: string;
}): Promise<CustomerTagWriteResult> {
  return prisma.$transaction(async (transaction) => {
    const customer = await findTenantCustomer(
      transaction,
      input.businessId,
      input.customerId,
    );
    if (!customer) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    const tag = await transaction.customerTag.findFirst({
      where: { id: input.tagId, businessId: input.businessId },
      select: { id: true, name: true },
    });
    if (!tag) {
      return { ok: false, reason: "INVALID_TAG" } as const;
    }

    const existing = await transaction.customerTagAssignment.findUnique({
      where: {
        customerId_tagId: { customerId: customer.id, tagId: tag.id },
      },
      select: { id: true },
    });
    if (existing) {
      return { ok: true, changed: false } as const;
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

    const added = await transaction.customerTagAssignment.createMany({
      data: [
        {
          businessId: input.businessId,
          customerId: customer.id,
          tagId: tag.id,
        },
      ],
      skipDuplicates: true,
    });
    if (added.count > 0) {
      await transaction.businessActivity.create({
        data: {
          type: "CUSTOMER_TAG_ASSIGNED",
          description: `تمت إضافة وسم العميل: ${tag.name}`,
          businessId: input.businessId,
          customerId: customer.id,
          createdById: input.actorId,
        },
      });
    }

    return { ok: true, changed: added.count > 0 } as const;
  });
}

/** Remove an existing Customer tag assignment, preserving missing-assignment no-op replay. */
export async function removeCustomerTagCommand(input: {
  businessId: string;
  customerId: string;
  tagId: string;
  actorId: string;
}): Promise<CustomerTagWriteResult> {
  return prisma.$transaction(async (transaction) => {
    const customer = await findTenantCustomer(
      transaction,
      input.businessId,
      input.customerId,
    );
    if (!customer) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    const assignment = await transaction.customerTagAssignment.findFirst({
      where: {
        businessId: input.businessId,
        customerId: customer.id,
        tagId: input.tagId,
      },
      include: { tag: { select: { name: true } } },
    });
    if (!assignment) {
      return { ok: true, changed: false } as const;
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

    const removed = await transaction.customerTagAssignment.deleteMany({
      where: { id: assignment.id, businessId: input.businessId },
    });
    if (removed.count > 0) {
      await transaction.businessActivity.create({
        data: {
          type: "CUSTOMER_TAG_REMOVED",
          description: `تمت إزالة وسم العميل: ${assignment.tag.name}`,
          businessId: input.businessId,
          customerId: customer.id,
          createdById: input.actorId,
        },
      });
    }

    return { ok: true, changed: removed.count > 0 } as const;
  });
}
