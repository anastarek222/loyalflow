"use server";

import { auth } from "@/auth";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { scheduleBusinessGoogleSheetsSync } from "@/lib/google-sheets-sync-scheduler";
import { canAccessBusiness, canPerform, type Capability } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  setCustomerRecordStatusCommand,
  updateCustomerRecordCommand,
} from "@/lib/server/business/customer-record-maintenance-command";
import {
  actionBooleanSchema,
  opaqueIdSchema,
} from "@/lib/validation/action-input";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const customerSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().max(50).optional(),
  phone: z.string().trim().min(8).max(25),
});

function normalizePhone(value: string) {
  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned.replace(/(?!^)\+/g, "");
}

async function getManagementContext(
  slug: string,
  customerId: string,
  capability: Capability = "CUSTOMERS_EDIT",
) {
  const parsedCustomerId = opaqueIdSchema.safeParse(customerId);
  if (!parsedCustomerId.success) redirect(`/businesses/${slug}/customers`);

  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, subscriptionLifecycleState: true },
  });
  if (!business) redirect("/businesses");
  if (!canAccessBusiness(session.user, business.id)) redirect("/dashboard");
  if (!canPerform(session.user, business.id, capability)) {
    redirect(`/businesses/${slug}/customers/${customerId}`);
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsedCustomerId.data, businessId: business.id },
    select: { id: true, publicToken: true },
  });
  if (!customer) redirect(`/businesses/${slug}/customers`);

  return { session, business, customer };
}

function revalidateCustomerPages(
  slug: string,
  customerId: string,
  publicToken: string,
) {
  revalidatePath(`/businesses/${slug}/customers/${customerId}`);
  revalidatePath(`/businesses/${slug}/scan/customer/${customerId}`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/reports`);
  revalidatePath(`/businesses/${slug}/activity`);
  revalidatePath(`/card/${publicToken}`);
  revalidatePath("/dashboard");
}

export async function updateCustomerRecordCommandAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  const { session, business, customer } = await getManagementContext(
    slug,
    customerId,
    "LOYALTY_ADJUST",
  );

  const parsed = customerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    redirect(`/businesses/${slug}/customers/${customerId}?error=invalid`);
  }
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(
      `/businesses/${slug}/customers/${customerId}?error=subscription-restricted`,
    );
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!/^\+?\d{8,15}$/.test(phone)) {
    redirect(`/businesses/${slug}/customers/${customerId}?error=phone`);
  }

  const duplicateCustomer = await prisma.customer.findFirst({
    where: { businessId: business.id, phone, id: { not: customer.id } },
    select: { id: true },
  });
  if (duplicateCustomer) {
    redirect(`/businesses/${slug}/customers/${customerId}?error=duplicate`);
  }

  const mutation = await updateCustomerRecordCommand({
    businessId: business.id,
    customerId: customer.id,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone,
    actor: session.user,
  });
  if (!mutation.ok) {
    if (mutation.reason === "SUBSCRIPTION_RESTRICTED") {
      redirect(
        `/businesses/${slug}/customers/${customerId}?error=subscription-restricted`,
      );
    }
    if (mutation.reason === "DUPLICATE") {
      redirect(`/businesses/${slug}/customers/${customerId}?error=duplicate`);
    }
    redirect(`/businesses/${slug}/customers`);
  }

  scheduleBusinessGoogleSheetsSync(mutation.integrationJobId);
  revalidateCustomerPages(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=updated`);
}

export async function setCustomerRecordStatusCommandAction(
  slug: string,
  customerId: string,
  isActive: boolean,
) {
  const parsedStatus = actionBooleanSchema.safeParse(isActive);
  if (!parsedStatus.success) {
    redirect(`/businesses/${slug}/customers/${customerId}?error=invalid`);
  }

  const { session, business, customer } = await getManagementContext(
    slug,
    customerId,
  );
  if (
    parsedStatus.data &&
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(
      `/businesses/${slug}/customers/${customerId}?error=subscription-restricted`,
    );
  }

  const mutation = await setCustomerRecordStatusCommand({
    businessId: business.id,
    customerId: customer.id,
    isActive: parsedStatus.data,
    actor: session.user,
  });
  if (!mutation.ok) {
    if (mutation.reason === "SUBSCRIPTION_RESTRICTED") {
      redirect(
        `/businesses/${slug}/customers/${customerId}?error=subscription-restricted`,
      );
    }
    redirect(`/businesses/${slug}/customers`);
  }

  scheduleBusinessGoogleSheetsSync(mutation.integrationJobId);
  revalidateCustomerPages(slug, customer.id, customer.publicToken);
  redirect(
    `/businesses/${slug}/customers/${customer.id}?success=${
      parsedStatus.data ? "reactivated" : "deactivated"
    }`,
  );
}
