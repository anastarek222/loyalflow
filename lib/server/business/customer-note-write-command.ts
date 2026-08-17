import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import prisma from "@/lib/prisma";

type CustomerNoteWriteFailure = Readonly<{
  ok: false;
  reason: "SUBSCRIPTION_RESTRICTED" | "TARGET_NOT_FOUND";
}>;

export type CustomerNoteWriteResult =
  | Readonly<{ ok: true }>
  | CustomerNoteWriteFailure;

/**
 * Authoritative Customer note creation boundary.
 *
 * Authentication, feature/capability checks, input parsing, presentation
 * preflight, redirects and revalidation remain in the action. This command
 * revalidates persisted OPERATE state and Customer tenant ownership before the
 * note + business activity audit are committed atomically.
 */
export async function createCustomerNoteCommand(input: {
  businessId: string;
  customerId: string;
  content: string;
  actorId: string;
}): Promise<CustomerNoteWriteResult> {
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

    await transaction.customerNote.create({
      data: {
        businessId: input.businessId,
        customerId: customer.id,
        content: input.content,
        createdById: input.actorId,
        updatedById: input.actorId,
      },
    });

    await transaction.businessActivity.create({
      data: {
        type: "CUSTOMER_NOTE_CREATED",
        description: "تمت إضافة ملاحظة داخلية للعميل",
        businessId: input.businessId,
        customerId: customer.id,
        createdById: input.actorId,
      },
    });

    return { ok: true } as const;
  });
}

/**
 * Authoritative Customer note update boundary.
 *
 * The command revalidates persisted OPERATE state, Customer ownership and note
 * ownership in the same transaction before the note update + audit commit.
 */
export async function updateCustomerNoteCommand(input: {
  businessId: string;
  customerId: string;
  noteId: string;
  content: string;
  actorId: string;
}): Promise<CustomerNoteWriteResult> {
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

    const note = await transaction.customerNote.findFirst({
      where: {
        id: input.noteId,
        businessId: input.businessId,
        customerId: customer.id,
      },
      select: { id: true },
    });
    if (!note) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    await transaction.customerNote.update({
      where: { id: note.id },
      data: {
        content: input.content,
        updatedById: input.actorId,
      },
    });

    await transaction.businessActivity.create({
      data: {
        type: "CUSTOMER_NOTE_UPDATED",
        description: "تم تعديل ملاحظة داخلية للعميل",
        businessId: input.businessId,
        customerId: customer.id,
        createdById: input.actorId,
      },
    });

    return { ok: true } as const;
  });
}
