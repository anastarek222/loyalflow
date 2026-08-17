"use server";

import { auth } from "@/auth";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import {
  getRapidEarnRateLimitKey,
  getRapidEarnWhere,
  RAPID_EARN_WINDOW_MS,
} from "@/lib/loyalty/fraud";
import {
  getOperationOrigin,
  operationPresentationPath,
  type OperationOrigin,
  type ScanOperationError,
} from "@/lib/loyalty/operation-origin";
import { getEarnDetails } from "@/lib/loyalty/operations";
import {
  isFinancialOperationConflictError,
  isFinancialOperationContextError,
} from "@/lib/loyalty/transactions";
import { canAccessBusiness, canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { executeLoyaltyEarnCommand } from "@/lib/server/business/loyalty-earn-command";
import { rateLimit } from "@/lib/utils/rate-limiter";
import { opaqueIdSchema } from "@/lib/validation/action-input";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const saleAmountSchema = z.object({
  saleAmount: z.coerce.number().int().min(1).max(1000000000),
});
const financialOperationSchema = z.string().uuid();

function getOptionalOperationId(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function operationPath(
  origin: OperationOrigin,
  slug: string,
  customerId: string,
  state: { success?: "earned"; error?: ScanOperationError },
  customerProfileError?: string,
) {
  if (origin === "SCAN" || state.success) {
    return operationPresentationPath(origin, slug, customerId, state);
  }
  return `${operationPresentationPath(origin, slug, customerId)}?error=${customerProfileError ?? "earned-invalid"}`;
}

function scanContextError(reason: string): ScanOperationError {
  return reason === "INVALID_BRANCH" ||
    reason === "BRANCH_REQUIRED_FOR_STAFF" ||
    reason === "INVALID_BRANCH_ASSIGNMENT"
    ? "invalid-branch"
    : reason === "ATTRIBUTION_REQUIRED" || reason === "INVALID_STAFF"
      ? "invalid-staff"
      : "generic";
}

function revalidateCustomerEarnSurfaces(
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

export async function addLoyaltyCommandAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  const origin = getOperationOrigin(formData);
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const parsedCustomerId = opaqueIdSchema.safeParse(customerId);
  if (!parsedCustomerId.success) {
    redirect(`/businesses/${slug}/customers`);
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      earnAmount: true,
      unitName: true,
      loyaltyMode: true,
    },
  });
  if (!business) {
    redirect("/businesses");
  }
  if (!canAccessBusiness(session.user, business.id)) {
    redirect("/dashboard");
  }
  if (!canPerform(session.user, business.id, "LOYALTY_EARN")) {
    redirect(
      operationPresentationPath(origin, slug, customerId, {
        ...(origin === "SCAN" ? { error: "permission" as const } : {}),
      }),
    );
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: parsedCustomerId.data,
      businessId: business.id,
      isActive: true,
    },
    select: { id: true, publicToken: true },
  });
  if (!customer) {
    redirect(`/businesses/${slug}/customers`);
  }

  const activityContext = await getActivityRequestContext();
  const branchId = getOptionalOperationId(formData, "branchId");
  const attributedStaffId = getOptionalOperationId(formData, "attributedStaffId");

  let saleAmount: number | undefined;
  if (business.loyaltyMode === "SALES_AMOUNT") {
    const parsedSale = saleAmountSchema.safeParse({
      saleAmount: formData.get("saleAmount"),
    });
    if (!parsedSale.success) {
      redirect(
        operationPath(origin, slug, customer.id, { error: "invalid" }, "sale-invalid"),
      );
    }
    saleAmount = parsedSale.data.saleAmount;
  }

  const { amount, transactionNote, activityDescription } = getEarnDetails({
    loyaltyMode: business.loyaltyMode,
    earnAmount: business.earnAmount,
    saleAmount,
    unitName: business.unitName,
  });

  const parsedOperation = financialOperationSchema.safeParse(
    formData.get("operationId"),
  );
  if (!parsedOperation.success) {
    redirect(
      operationPath(origin, slug, customer.id, { error: "invalid" }, "earned-invalid"),
    );
  }
  const idempotencyKey = parsedOperation.data;

  const completedOperation = await prisma.loyaltyTransaction.findUnique({
    where: {
      businessId_idempotencyKey: {
        businessId: business.id,
        idempotencyKey,
      },
    },
    select: {
      customerId: true,
      type: true,
      amount: true,
      sourceLoyaltyMode: true,
      saleAmount: true,
      promotionApplication: { select: { baseAmount: true } },
    },
  });

  if (completedOperation) {
    const baseAmount =
      completedOperation.promotionApplication?.baseAmount ?? completedOperation.amount;
    if (
      completedOperation.customerId !== customer.id ||
      completedOperation.type !== "EARN" ||
      completedOperation.sourceLoyaltyMode !== business.loyaltyMode ||
      completedOperation.saleAmount !== (saleAmount ?? null) ||
      baseAmount !== amount
    ) {
      redirect(
        operationPath(origin, slug, customer.id, { error: "conflict" }, "earned-conflict"),
      );
    }
    redirect(operationPath(origin, slug, customer.id, { success: "earned" }));
  }

  const rapidEarnInput = {
    businessId: business.id,
    customerId: customer.id,
    createdById: session.user.id,
    amount,
  };
  const rapidEarnLimit = rateLimit(getRapidEarnRateLimitKey(rapidEarnInput), {
    limit: 1,
    windowMs: RAPID_EARN_WINDOW_MS,
  });
  if (!rapidEarnLimit.allowed) {
    redirect(
      operationPath(origin, slug, customer.id, { error: "conflict" }, "earned-too-soon"),
    );
  }

  const recentDuplicateEarn = await prisma.loyaltyTransaction.findFirst({
    where: getRapidEarnWhere(rapidEarnInput),
    select: { id: true },
  });
  if (recentDuplicateEarn) {
    redirect(
      operationPath(origin, slug, customer.id, { error: "conflict" }, "earned-too-soon"),
    );
  }

  let newBalance: number | null;
  try {
    newBalance = await executeLoyaltyEarnCommand({
      businessId: business.id,
      customerId: customer.id,
      actor: session.user,
      branchId,
      attributedStaffId,
      activityContext,
      amount,
      loyaltyMode: business.loyaltyMode,
      saleAmount,
      idempotencyKey,
      transactionNote,
      activityDescription,
      reportContextFailure: origin === "SCAN",
    });
  } catch (error) {
    if (isFinancialOperationConflictError(error)) {
      redirect(
        operationPath(origin, slug, customer.id, { error: "conflict" }, "earned-conflict"),
      );
    }
    if (isFinancialOperationContextError(error) && origin === "SCAN") {
      redirect(
        operationPath(origin, slug, customer.id, {
          error: scanContextError(error.reason),
        }),
      );
    }
    throw error;
  }

  if (newBalance === null) {
    redirect(
      origin === "SCAN"
        ? operationPath(origin, slug, customer.id, { error: "generic" })
        : `/businesses/${slug}/customers`,
    );
  }

  await syncBusinessToGoogleSheetSafely(business.id);
  revalidateCustomerEarnSurfaces(slug, customer.id, customer.publicToken);
  redirect(operationPath(origin, slug, customer.id, { success: "earned" }));
}
