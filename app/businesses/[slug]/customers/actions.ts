"use server";

import { auth } from "@/auth";
import { parseCustomerRegistration } from "@/lib/customers/registration";
import {
  getBulkStateChangeIds,
  parseSelectedCustomerIds,
  type BulkCustomerOperation,
} from "@/lib/customers/bulk";
import {
  canManageCustomerNotesTags,
  canUseCustomerBulkOperations,
} from "@/lib/customers/feature-access";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { isWithinPlanLimit } from "@/lib/entitlements";
import { getEffectivePlanLimits } from "@/lib/entitlements-server";
import { scheduleBusinessGoogleSheetsSync } from "@/lib/google-sheets-sync-scheduler";
import { createCustomerCommand } from "@/lib/server/business/customer-create-command";
import {
  mutateBulkCustomerTagCommand,
  setBulkCustomerStatusCommand,
} from "@/lib/server/business/customer-bulk-command";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
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
  changed: number,
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
    select: {
      id: true,
      slug: true,
      plan: true,
      subscriptionLifecycleState: true,
    },
  });
  if (!business) redirect("/businesses");
  if (!canUseCustomerBulkOperations(session.user, business.id, business.plan)) {
    redirect(`/businesses/${slug}/customers`);
  }

  return { session, business };
}

export async function bulkCustomerAction(slug: string, formData: FormData) {
  const { session, business } = await getBulkCustomerContext(slug);
  const parsedIds = parseSelectedCustomerIds(formData.get("customerIds"));
  const operation = formData.get("operation");
  const tagId = formData.get("tagId");

  if (
    !parsedIds ||
    typeof operation !== "string" ||
    !bulkOperationValues.has(operation as BulkCustomerOperation)
  ) {
    redirect(bulkResultUrl(slug, "invalid", 0, 0));
  }

  if (
    (operation === "ADD_TAG" || operation === "REMOVE_TAG") &&
    !canManageCustomerNotesTags(session.user, business.id, business.plan)
  ) {
    redirect(bulkResultUrl(slug, "invalid", parsedIds.length, 0));
  }

  const customers = await prisma.customer.findMany({
    where: { businessId: business.id, id: { in: parsedIds } },
    select: { id: true, businessId: true, isActive: true },
  });

  if (customers.length !== parsedIds.length) {
    redirect(bulkResultUrl(slug, "invalid-selection", parsedIds.length, 0));
  }

  if (operation === "ACTIVATE" || operation === "DEACTIVATE") {
    const activate = operation === "ACTIVATE";
    const changedIds = getBulkStateChangeIds(
      customers,
      business.id,
      parsedIds,
      activate,
    );
    if (!changedIds) {
      redirect(bulkResultUrl(slug, "invalid-selection", parsedIds.length, 0));
    }

    let committedChangedIds = changedIds;
    if (changedIds.length > 0) {
      if (
        activate &&
        !canPerformSubscriptionOperation(
          business.subscriptionLifecycleState,
          "OPERATE",
        )
      ) {
        redirect(`/businesses/${slug}/customers?error=subscription-restricted`);
      }

      const mutation = await setBulkCustomerStatusCommand({
        businessId: business.id,
        customerIds: parsedIds,
        activate,
        actor: session.user,
      });
      if (!mutation.ok) {
        if (mutation.reason === "SUBSCRIPTION_RESTRICTED") {
          redirect(`/businesses/${slug}/customers?error=subscription-restricted`);
        }
        redirect(bulkResultUrl(slug, "invalid-selection", parsedIds.length, 0));
      }
      committedChangedIds = [...mutation.changedIds];
    }

    revalidateBulkCustomerPages(slug);
    redirect(
      bulkResultUrl(
        slug,
        operation.toLowerCase(),
        parsedIds.length,
        committedChangedIds.length,
      ),
    );
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
    where: {
      businessId: business.id,
      tagId: tag.id,
      customerId: { in: parsedIds },
    },
    select: { id: true, customerId: true },
  });
  const existingCustomerIds = new Set(
    existingAssignments.map((assignment) => assignment.customerId),
  );
  const changedIds =
    operation === "ADD_TAG"
      ? parsedIds.filter((customerId) => !existingCustomerIds.has(customerId))
      : existingAssignments.map((assignment) => assignment.customerId);

  let committedChangedIds = changedIds;
  if (changedIds.length > 0) {
    if (
      !canPerformSubscriptionOperation(
        business.subscriptionLifecycleState,
        "OPERATE",
      )
    ) {
      redirect(`/businesses/${slug}/customers?error=subscription-restricted`);
    }

    const mutation = await mutateBulkCustomerTagCommand({
      businessId: business.id,
      customerIds: parsedIds,
      tagId: tag.id,
      operation: operation as "ADD_TAG" | "REMOVE_TAG",
      actor: session.user,
    });
    if (!mutation.ok) {
      if (mutation.reason === "SUBSCRIPTION_RESTRICTED") {
        redirect(`/businesses/${slug}/customers?error=subscription-restricted`);
      }
      if (mutation.reason === "INVALID_SELECTION") {
        redirect(bulkResultUrl(slug, "invalid-selection", parsedIds.length, 0));
      }
      redirect(bulkResultUrl(slug, "invalid", parsedIds.length, 0));
    }
    committedChangedIds = [...mutation.changedIds];
  }

  revalidateBulkCustomerPages(slug);
  redirect(
    bulkResultUrl(
      slug,
      operation.toLowerCase(),
      parsedIds.length,
      committedChangedIds.length,
    ),
  );
}

function revalidateBulkCustomerPages(slug: string) {
  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/businesses/${slug}/campaigns`);
  revalidatePath(`/businesses/${slug}/reports`);
  revalidatePath(`/businesses/${slug}/activity`);
}

export async function createCustomerAction(slug: string, formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      plan: true,
      subscriptionLifecycleState: true,
    },
  });

  if (!business) {
    redirect("/businesses");
  }

  const canAccess = canPerform(session.user, business.id, "CUSTOMERS_EDIT");
  if (!canAccess) {
    redirect("/dashboard");
  }

  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "EXPAND",
    )
  ) {
    redirect(`/businesses/${slug}/customers?error=subscription-restricted`);
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
    select: { id: true },
  });

  if (existingCustomer) {
    redirect(`/businesses/${slug}/customers?error=duplicate`);
  }

  const [customerCount, planLimits] = await Promise.all([
    prisma.customer.count({ where: { businessId: business.id } }),
    getEffectivePlanLimits(business.plan),
  ]);
  if (
    !isWithinPlanLimit(business.plan, "CUSTOMERS", customerCount, 1, planLimits)
  ) {
    redirect(`/businesses/${slug}/customers?error=plan-limit`);
  }

  const creation = await createCustomerCommand({
    businessId: business.id,
    customer: parsed,
    actor: session.user,
  });

  if (!creation.ok) {
    if (creation.reason === "BUSINESS_NOT_FOUND") {
      redirect("/businesses");
    }
    if (creation.reason === "DUPLICATE") {
      redirect(`/businesses/${slug}/customers?error=duplicate`);
    }
    if (creation.reason === "PLAN_LIMIT") {
      redirect(`/businesses/${slug}/customers?error=plan-limit`);
    }
    redirect(`/businesses/${slug}/customers?error=subscription-restricted`);
  }

  const createdCustomer = creation.customer;
  scheduleBusinessGoogleSheetsSync(creation.integrationJobId);

  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/card/${createdCustomer.publicToken}`);
  revalidatePath("/dashboard");

  redirect(`/businesses/${slug}/customers/${createdCustomer.id}?success=created`);
}
