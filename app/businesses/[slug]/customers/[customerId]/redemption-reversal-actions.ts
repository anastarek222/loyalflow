"use server";

import { auth } from "@/auth";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import {
  recordRedemptionReversal,
  type RedemptionReversalBlockReason,
} from "@/lib/loyalty/redemption-reversal";
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

const redemptionReversalSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  operationId: z.string().uuid(),
  restoreUnlock: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
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

function reversalError(reason: RedemptionReversalBlockReason) {
  switch (reason) {
    case "ORIGINAL_REDEMPTION_NOT_FOUND":
      return "redemption-reversal-original-missing";
    case "ALREADY_REVERSED":
      return "redemption-reversal-complete";
    case "UNLOCK_RESTORE_UNSUPPORTED":
      return "redemption-reversal-unlock-unsupported";
  }
}

function revalidateRedemptionReversalSurfaces(
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

export async function reverseRedemptionAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const parsedCustomerId = opaqueIdSchema.safeParse(customerId);
  const parsedOriginalRedemptionId = opaqueIdSchema.safeParse(
    formData.get("originalRedemptionId"),
  );
  const parsedOriginalTransactionId = opaqueIdSchema.safeParse(
    formData.get("originalTransactionId"),
  );
  const parsedInput = redemptionReversalSchema.safeParse({
    reason: formData.get("reason"),
    operationId: formData.get("operationId"),
    restoreUnlock: formData.get("restoreUnlock") ?? "false",
  });
  const branchId = parseOptionalOpaqueId(formData.get("branchId"));
  const attributedStaffId = parseOptionalOpaqueId(
    formData.get("attributedStaffId"),
  );

  if (
    !parsedCustomerId.success ||
    !parsedOriginalRedemptionId.success ||
    !parsedOriginalTransactionId.success ||
    !parsedInput.success ||
    !branchId.valid ||
    !attributedStaffId.valid
  ) {
    redirect(
      `/businesses/${slug}/customers/${customerId}?error=redemption-reversal-invalid`,
    );
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
      `/businesses/${slug}/customers/${parsedCustomerId.data}?error=redemption-reversal-permission`,
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

  let result: Awaited<ReturnType<typeof recordRedemptionReversal>>;
  try {
    result = await prisma.$transaction((transaction) =>
      recordRedemptionReversal(transaction, {
        customerId: customer.id,
        businessId: business.id,
        originalRedemptionId: parsedOriginalRedemptionId.data,
        originalTransactionId: parsedOriginalTransactionId.data,
        actor,
        branchId: branchId.value,
        attributedStaffId: attributedStaffId.value,
        activityContext,
        reason: parsedInput.data.reason,
        idempotencyKey: parsedInput.data.operationId,
        restoreUnlock: parsedInput.data.restoreUnlock,
      }),
    );
  } catch (error) {
    if (isFinancialOperationConflictError(error)) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=redemption-reversal-conflict`,
      );
    }
    if (isFinancialOperationContextError(error)) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=redemption-reversal-context`,
      );
    }
    if (isFinancialOperationAbortedError(error)) {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=redemption-reversal-aborted`,
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
  revalidateRedemptionReversalSurfaces(slug, customer.id, customer.publicToken);

  redirect(
    `/businesses/${slug}/customers/${customer.id}?success=redemption-reversed`,
  );
}
