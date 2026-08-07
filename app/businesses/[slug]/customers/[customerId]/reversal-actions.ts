"use server";

import { auth } from "@/auth";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import {
  recordEarnReversal,
  type EarnReversalBlockReason,
} from "@/lib/loyalty/earn-reversal";
import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import {
  isFinancialOperationAbortedError,
  isFinancialOperationConflictError,
  isFinancialOperationContextError,
} from "@/lib/loyalty/transactions";
import prisma from "@/lib/prisma";
import { opaqueIdSchema } from "@/lib/validation/action-input";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const earnReversalSchema = z.object({
  kind: z.enum(["EARN_REFUND", "EARN_VOID"]),
  amount: z.coerce.number().int().min(1).max(1_000_000_000),
  saleAmount: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0
        ? undefined
        : value,
    z.coerce.number().int().min(1).max(1_000_000_000).optional(),
  ),
  reason: z.string().trim().min(1).max(500),
  operationId: z.string().uuid(),
});

function parseOptionalOpaqueId(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { valid: true as const, value: undefined };
  }

  const parsed = opaqueIdSchema.safeParse(value.trim());
  return parsed.success
    ? { valid: true as const, value: parsed.data }
    : { valid: false as const, value: undefined };
}

function reversalError(reason: EarnReversalBlockReason) {
  switch (reason) {
    case "ORIGINAL_TRANSACTION_NOT_FOUND":
      return "reversal-original-missing";
    case "ALREADY_FULLY_REVERSED":
      return "reversal-complete";
    case "REVERSAL_EXCEEDS_ORIGINAL":
    case "SALE_REVERSAL_EXCEEDS_ORIGINAL":
      return "reversal-exceeds-original";
    case "SALE_AMOUNT_REQUIRED":
    case "UNEXPECTED_SALE_AMOUNT":
      return "reversal-sale-invalid";
    case "VOID_REQUIRES_FULL_ORIGINAL":
      return "reversal-void-invalid";
    case "INSUFFICIENT_BALANCE":
      return "reversal-insufficient-balance";
  }
}

function revalidateReversalSurfaces(
  slug: string,
  customerId: string,
  publicToken: string,
) {
  revalidatePath(`/businesses/${slug}/customers/${customerId}`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/reports`);
  revalidatePath(`/businesses/${slug}/activity`);
  revalidatePath(`/card/${publicToken}`);
  revalidatePath("/dashboard");
}

export async function reverseEarnAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const parsedCustomerId = opaqueIdSchema.safeParse(customerId);
  const parsedOriginalTransactionId = opaqueIdSchema.safeParse(
    formData.get("originalTransactionId"),
  );
  const parsedInput = earnReversalSchema.safeParse({
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    saleAmount: formData.get("saleAmount"),
    reason: formData.get("reason"),
    operationId: formData.get("operationId"),
  });
  const branchId = parseOptionalOpaqueId(formData.get("branchId"));
  const attributedStaffId = parseOptionalOpaqueId(
    formData.get("attributedStaffId"),
  );

  if (
    !parsedCustomerId.success ||
    !parsedOriginalTransactionId.success ||
    !parsedInput.success ||
    !branchId.valid ||
    !attributedStaffId.valid
  ) {
    redirect(`/businesses/${slug}/customers/${customerId}?error=reversal-invalid`);
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });

  if (!business) {
    redirect("/businesses");
  }

  const actor: FinancialOperationActor = {
    id: session.user.id,
    role: session.user.role,
    businessId: session.user.businessId ?? null,
  };
  const actorAllowed =
    actor.role === "SUPER_ADMIN" ||
    (actor.role === "OWNER" && actor.businessId === business.id);

  if (!actorAllowed) {
    redirect(
      `/businesses/${slug}/customers/${parsedCustomerId.data}?error=reversal-permission`,
    );
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: parsedCustomerId.data,
      businessId: business.id,
      isActive: true,
    },
    select: {
      id: true,
      publicToken: true,
    },
  });

  if (!customer) {
    redirect(`/businesses/${slug}/customers`);
  }

  const activityContext = await getActivityRequestContext();

  let result: Awaited<ReturnType<typeof recordEarnReversal>>;
  try {
    result = await prisma.$transaction((transaction) =>
      recordEarnReversal(transaction, {
        customerId: customer.id,
        businessId: business.id,
        originalTransactionId: parsedOriginalTransactionId.data,
        actor,
        branchId: branchId.value,
        attributedStaffId: attributedStaffId.value,
        activityContext,
        kind: parsedInput.data.kind,
        amount: parsedInput.data.amount,
        saleAmount: parsedInput.data.saleAmount,
        reason: parsedInput.data.reason,
        idempotencyKey: parsedInput.data.operationId,
      }),
    );
  } catch (error) {
    if (isFinancialOperationConflictError(error)) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=reversal-conflict`,
      );
    }
    if (isFinancialOperationContextError(error)) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=reversal-context`,
      );
    }
    if (isFinancialOperationAbortedError(error)) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=reversal-aborted`,
      );
    }
    throw error;
  }

  if (result.status === "BLOCKED") {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=${reversalError(result.reason)}`,
    );
  }

  await syncBusinessToGoogleSheetSafely(business.id);
  revalidateReversalSurfaces(slug, customer.id, customer.publicToken);

  redirect(
    `/businesses/${slug}/customers/${customer.id}?success=${
      parsedInput.data.kind === "EARN_VOID" ? "earn-voided" : "earn-refunded"
    }`,
  );
}
