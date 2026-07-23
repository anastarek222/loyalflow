"use server";

import { auth } from "@/auth";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import {
  generateCustomerCode,
  getCustomerDisplayName,
  parseCustomerRegistration,
} from "@/lib/customers/registration";
import {
  getBulkStateChangeIds,
  parseSelectedCustomerIds,
  type BulkCustomerOperation,
} from "@/lib/customers/bulk";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const bulkOperationValues = new Set<BulkCustomerOperation>([
  "ADD_TAG",
  "REMOVE_TAG",
  "ACTIVATE",
  "DEACTIVATE",
]);

function bulkResultUrl(
  slug: string,
  result: string,
  selected: number,
  changed: number
) {
  const parameters = new URLSearchParams({
    bulk: result,
    selected: String(selected),
    changed: String(changed),
  });
  return `/businesses/${slug}/customers?${parameters.toString()}`;
}

async function getBulkCustomerContext(slug: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!business) redirect("/businesses");
  if (!canPerform(session.user, business.id, "CUSTOMERS_EDIT")) {
    redirect(`/businesses/${slug}/customers`);
  }

  return { session, business };
}

export async function bulkCustomerAction(slug: string, formData: FormData) {
  const { session, business } = await getBulkCustomerContext(slug);
  const parsedIds = parseSelectedCustomerIds(formData.get("customerIds"));
  const operation = formData.get("operation");
  const tagId = formData.get("tagId");

  if (!parsedIds || typeof operation !== "string" || !bulkOperationValues.has(operation as BulkCustomerOperation)) {
    redirect(bulkResultUrl(slug, "invalid", 0, 0));
  }

  const customers = await prisma.customer.findMany({
    where: { businessId: business.id, id: { in: parsedIds } },
    select: { id: true, businessId: true, isActive: true },
  });

  // Do not mutate a subset: any missing/cross-tenant identifier aborts the
  // entire operation before a transaction starts.
  if (customers.length !== parsedIds.length) {
    redirect(bulkResultUrl(slug, "invalid-selection", parsedIds.length, 0));
  }

  if (operation === "ACTIVATE" || operation === "DEACTIVATE") {
    const activate = operation === "ACTIVATE";
    const changedIds = getBulkStateChangeIds(
      customers,
      business.id,
      parsedIds,
      activate
    );
    if (!changedIds) {
      redirect(bulkResultUrl(slug, "invalid-selection", parsedIds.length, 0));
    }

    if (changedIds.length > 0) {
      const activityContext = await getActivityRequestContext();
      await prisma.$transaction(async (transaction) => {
        const updated = await transaction.customer.updateMany({
          where: { businessId: business.id, id: { in: changedIds } },
          data: { isActive: activate },
        });
        if (updated.count !== changedIds.length) {
          throw new Error("Bulk customer status update did not affect every selected customer.");
        }
        await transaction.businessActivity.createMany({
          data: changedIds.map((customerId) => ({
            type: activate ? "CUSTOMER_REACTIVATED" : "CUSTOMER_DEACTIVATED",
            description: activate ? "تمت إعادة تفعيل العميل عبر عملية جماعية" : "تم إيقاف العميل عبر عملية جماعية",
            businessId: business.id,
            customerId,
            ...activityActorFields(session.user, business.id),
            ...activityRequestMetadata(activityContext),
          })),
        });
      });
    }

    await syncBusinessToGoogleSheetSafely(business.id);
    revalidateBulkCustomerPages(slug);
    redirect(bulkResultUrl(slug, operation.toLowerCase(), parsedIds.length, changedIds.length));
  }

  if (typeof tagId !== "string") {
    redirect(bulkResultUrl(slug, "invalid", parsedIds.length, 0));
  }
  const tag = await prisma.customerTag.findFirst({
    where: { id: tagId, businessId: business.id },
    select: { id: true, name: true },
  });
  if (!tag) redirect(bulkResultUrl(slug, "invalid", parsedIds.length, 0));

  const existingAssignments = await prisma.customerTagAssignment.findMany({
    where: { businessId: business.id, tagId: tag.id, customerId: { in: parsedIds } },
    select: { id: true, customerId: true },
  });
  const existingCustomerIds = new Set(existingAssignments.map((assignment) => assignment.customerId));
  const changedIds = operation === "ADD_TAG"
    ? parsedIds.filter((customerId) => !existingCustomerIds.has(customerId))
    : existingAssignments.map((assignment) => assignment.customerId);

  if (changedIds.length > 0) {
    const activityContext = await getActivityRequestContext();
    await prisma.$transaction(async (transaction) => {
      if (operation === "ADD_TAG") {
        const added = await transaction.customerTagAssignment.createMany({
          data: changedIds.map((customerId) => ({
            businessId: business.id,
            customerId,
            tagId: tag.id,
          })),
        });
        if (added.count !== changedIds.length) {
          throw new Error("Bulk tag assignment did not affect every expected customer.");
        }
      } else {
        const removed = await transaction.customerTagAssignment.deleteMany({
          where: { businessId: business.id, tagId: tag.id, customerId: { in: changedIds } },
        });
        if (removed.count !== changedIds.length) {
          throw new Error("Bulk tag removal did not affect every expected assignment.");
        }
      }

      await transaction.businessActivity.createMany({
        data: changedIds.map((customerId) => ({
          type: operation === "ADD_TAG" ? "CUSTOMER_TAG_ASSIGNED" : "CUSTOMER_TAG_REMOVED",
          description: operation === "ADD_TAG" ? `تمت إضافة وسم العميل عبر عملية جماعية: ${tag.name}` : `تمت إزالة وسم العميل عبر عملية جماعية: ${tag.name}`,
          businessId: business.id,
          customerId,
          ...activityActorFields(session.user, business.id),
          ...activityRequestMetadata(activityContext),
        })),
      });
    });
  }

  await syncBusinessToGoogleSheetSafely(business.id);
  revalidateBulkCustomerPages(slug);
  redirect(bulkResultUrl(slug, operation.toLowerCase(), parsedIds.length, changedIds.length));
}

function revalidateBulkCustomerPages(slug: string) {
  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/businesses/${slug}/campaigns`);
  revalidatePath(`/businesses/${slug}/reports`);
  revalidatePath(`/businesses/${slug}/activity`);
}

export async function createCustomerAction(
  slug: string,
  formData: FormData
) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!business) {
    redirect("/businesses");
  }

  const canAccess = canPerform(
    session.user,
    business.id,
    "CUSTOMERS_EDIT"
  );

  if (!canAccess) {
    redirect("/dashboard");
  }

  const parsed = parseCustomerRegistration({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
  });

  if (!parsed) {
    redirect(`/businesses/${slug}/customers?error=invalid`);
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
    redirect(`/businesses/${slug}/customers?error=duplicate`);
  }

  const customerCode = await generateCustomerCode(
    prisma,
    business.id,
    business.slug
  );

  const customerName = getCustomerDisplayName(parsed);
  const activityContext = await getActivityRequestContext();

  const createdCustomer =
    await prisma.$transaction(async (transaction) => {
      const customer =
        await transaction.customer.create({
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
        description: `تم إنشاء العميل ${customerName}`,
        businessId: business.id,
        customerId: customer.id,
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
      },
    });

      return customer;
    });

  await syncBusinessToGoogleSheetSafely(business.id);

  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/card/${createdCustomer.publicToken}`);
  revalidatePath("/dashboard");

  redirect(
    `/businesses/${slug}/customers/${createdCustomer.id}?success=created`
  );
}
