"use server";

import { auth } from "@/auth";
import { getRewardLabel } from "@/lib/loyalty/operations";
import {
  getRapidRedemptionRateLimitKey,
  getRapidRedemptionWhere,
  RAPID_EARN_WINDOW_MS,
} from "@/lib/loyalty/fraud";
import {
  isFinancialOperationConflictError,
  isFinancialOperationContextError,
} from "@/lib/loyalty/transactions";
import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import {
  getOperationOrigin,
  operationPresentationPath,
  type OperationOrigin,
  type ScanOperationError,
} from "@/lib/loyalty/operation-origin";
import { canAccessBusiness, canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/utils/rate-limiter";
import { scheduleIntegrationJobs } from "@/lib/integration-job-scheduler";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { opaqueIdSchema } from "@/lib/validation/action-input";
import { redeemLoyaltyRewardCommand } from "@/lib/server/business/loyalty-redemption-command";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const financialOperationSchema = z.string().uuid();

function getOptionalOperationId(formData: FormData | undefined, field: string) {
  const value = formData?.get(field);
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function getFinancialActor(session: { user: FinancialOperationActor }) {
  return session.user;
}

function operationPath(
  origin: OperationOrigin,
  slug: string,
  customerId: string,
  state: { success?: "redeemed"; error?: ScanOperationError },
  customerProfileError?: string,
) {
  if (origin === "SCAN" || state.success) {
    return operationPresentationPath(origin, slug, customerId, state);
  }
  return `${operationPresentationPath(origin, slug, customerId)}?error=${customerProfileError ?? "redemption-invalid"}`;
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

function revalidateCustomerSurfaces(
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

export async function redeemRewardCommandAction(
  slug: string,
  customerId: string,
  rewardId?: string,
  formData?: FormData,
) {
  const origin = getOperationOrigin(formData);
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsedCustomerId = opaqueIdSchema.safeParse(customerId);
  if (!parsedCustomerId.success) redirect(`/businesses/${slug}/customers`);

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      rewardType: true,
      rewardCode: true,
      rewardThreshold: true,
      rewardName: true,
    },
  });
  if (!business) redirect("/businesses");
  if (!canAccessBusiness(session.user, business.id)) redirect("/dashboard");
  if (!canPerform(session.user, business.id, "LOYALTY_REDEEM")) {
    redirect(
      operationPresentationPath(origin, slug, customerId, {
        ...(origin === "SCAN" ? { error: "permission" } : {}),
      }),
    );
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsedCustomerId.data, businessId: business.id, isActive: true },
    select: { id: true, publicToken: true },
  });
  if (!customer) redirect(`/businesses/${slug}/customers`);

  const parsedRewardId = rewardId ? opaqueIdSchema.safeParse(rewardId) : null;
  if (parsedRewardId && !parsedRewardId.success) {
    redirect(operationPath(origin, slug, customer.id, { error: "reward-unavailable" }, "reward-unavailable"));
  }

  const selectedReward = parsedRewardId?.success
    ? await prisma.reward.findFirst({
        where: { id: parsedRewardId.data, businessId: business.id, isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
          code: true,
          cost: true,
          expiresAfterDays: true,
          businessId: true,
        },
      })
    : null;

  if (rewardId && !selectedReward) {
    redirect(operationPath(origin, slug, customer.id, { error: "reward-unavailable" }, "reward-unavailable"));
  }

  const rewardName = selectedReward?.name ?? business.rewardName;
  const rewardLabel = getRewardLabel(
    selectedReward?.type ?? business.rewardType,
    rewardName,
    selectedReward?.code ?? business.rewardCode,
  );
  const cost = selectedReward?.cost ?? business.rewardThreshold;

  const parsedOperation = financialOperationSchema.safeParse(formData?.get("operationId"));
  if (!parsedOperation.success) {
    redirect(operationPath(origin, slug, customer.id, { error: "invalid" }, "redemption-invalid"));
  }
  const idempotencyKey = parsedOperation.data;
  const branchId = getOptionalOperationId(formData, "branchId");
  const attributedStaffId = getOptionalOperationId(formData, "attributedStaffId");
  const activityContext = await getActivityRequestContext();

  const completedOperation = await prisma.loyaltyTransaction.findUnique({
    where: { businessId_idempotencyKey: { businessId: business.id, idempotencyKey } },
    select: {
      customerId: true,
      type: true,
      amount: true,
      rewardRedemption: { select: { rewardId: true, cost: true } },
    },
  });

  if (completedOperation) {
    if (
      completedOperation.customerId !== customer.id ||
      completedOperation.type !== "REDEEM" ||
      completedOperation.amount !== -cost ||
      completedOperation.rewardRedemption?.rewardId !== (selectedReward?.id ?? null) ||
      completedOperation.rewardRedemption?.cost !== cost
    ) {
      redirect(operationPath(origin, slug, customer.id, { error: "conflict" }, "redemption-conflict"));
    }
    redirect(operationPath(origin, slug, customer.id, { success: "redeemed" }));
  }

  const rapidInput = {
    businessId: business.id,
    customerId: customer.id,
    createdById: session.user.id,
    cost,
  };
  const rapidLimit = rateLimit(getRapidRedemptionRateLimitKey(rapidInput), {
    limit: 1,
    windowMs: RAPID_EARN_WINDOW_MS,
  });
  if (!rapidLimit.allowed) {
    redirect(operationPath(origin, slug, customer.id, { error: "conflict" }, "redeemed-too-soon"));
  }
  const recentDuplicate = await prisma.loyaltyTransaction.findFirst({
    where: getRapidRedemptionWhere(rapidInput),
    select: { id: true },
  });
  if (recentDuplicate) {
    redirect(operationPath(origin, slug, customer.id, { error: "conflict" }, "redeemed-too-soon"));
  }

  let result;
  try {
    result = await redeemLoyaltyRewardCommand({
      businessId: business.id,
      customerId: customer.id,
      actor: getFinancialActor(session),
      branchId,
      attributedStaffId,
      activityContext,
      cost,
      rewardLabel,
      rewardName,
      rewardId: selectedReward?.id,
      rewardExpiresAfterDays: selectedReward?.expiresAfterDays,
      idempotencyKey,
      reportContextFailure: origin === "SCAN",
    });
  } catch (error) {
    if (isFinancialOperationConflictError(error)) {
      redirect(operationPath(origin, slug, customer.id, { error: "conflict" }, "redemption-conflict"));
    }
    if (isFinancialOperationContextError(error) && origin === "SCAN") {
      redirect(operationPath(origin, slug, customer.id, { error: scanContextError(error.reason) }));
    }
    throw error;
  }

  if (!result.ok) {
    redirect(
      result.reason === "REWARD_EXPIRED"
        ? operationPath(origin, slug, customer.id, { error: "reward-unavailable" }, "reward-expired")
        : operationPath(origin, slug, customer.id, { error: "insufficient-balance" }, "not-enough"),
    );
  }

  scheduleIntegrationJobs(result.integrationJobIds);
  revalidateCustomerSurfaces(slug, customer.id, customer.publicToken);
  redirect(operationPath(origin, slug, customer.id, { success: "redeemed" }));
}
