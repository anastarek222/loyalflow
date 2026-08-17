"use server";

import { auth } from "@/auth";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { scheduleBusinessGoogleSheetsSync } from "@/lib/google-sheets-sync-scheduler";
import { isFinancialOperationConflictError } from "@/lib/loyalty/transactions";
import { canAccessBusiness, canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { adjustCustomerBalanceCommand } from "@/lib/server/business/customer-balance-adjustment-command";
import { opaqueIdSchema } from "@/lib/validation/action-input";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const adjustmentSchema = z.object({
  direction: z.enum(["ADD", "SUBTRACT"]),
  amount: z.coerce.number().int().min(1).max(1000000),
  reason: z.string().trim().min(3).max(200),
});

const financialOperationSchema = z.string().uuid();

function optionalOpaqueId(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = opaqueIdSchema.safeParse(value.trim());
  return parsed.success ? parsed.data : undefined;
}

function revalidateCustomerBalanceSurfaces(
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

export async function adjustCustomerBalanceCommandAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsedCustomerId = opaqueIdSchema.safeParse(customerId);
  if (!parsedCustomerId.success) {
    redirect(`/businesses/${slug}/customers`);
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!business) redirect("/businesses");

  if (!canAccessBusiness(session.user, business.id)) redirect("/dashboard");
  if (!canPerform(session.user, business.id, "LOYALTY_ADJUST")) {
    redirect(`/businesses/${slug}/customers/${customerId}`);
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: parsedCustomerId.data,
      businessId: business.id,
    },
    select: { id: true, publicToken: true },
  });
  if (!customer) redirect(`/businesses/${slug}/customers`);

  const parsed = adjustmentSchema.safeParse({
    direction: formData.get("direction"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=adjustment-invalid`,
    );
  }

  const parsedOperation = financialOperationSchema.safeParse(
    formData.get("operationId"),
  );
  if (!parsedOperation.success) {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=adjustment-invalid`,
    );
  }

  const activityContext = await getActivityRequestContext();

  let result;
  try {
    result = await adjustCustomerBalanceCommand({
      businessId: business.id,
      customerId: customer.id,
      actor: session.user,
      branchId: optionalOpaqueId(formData.get("branchId")),
      attributedStaffId: optionalOpaqueId(formData.get("attributedStaffId")),
      activityContext,
      direction: parsed.data.direction,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      idempotencyKey: parsedOperation.data,
    });
  } catch (error) {
    if (isFinancialOperationConflictError(error)) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=adjustment-conflict`,
      );
    }
    throw error;
  }

  if (result.balance === null || !result.integrationJobId) {
    redirect(
      parsed.data.direction === "SUBTRACT"
        ? `/businesses/${slug}/customers/${customer.id}?error=adjustment-negative`
        : `/businesses/${slug}/customers/${customer.id}?error=adjustment-invalid`,
    );
  }

  scheduleBusinessGoogleSheetsSync(result.integrationJobId);
  revalidateCustomerBalanceSurfaces(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=adjusted`);
}
