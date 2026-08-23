"use server";

import { auth } from "@/auth";
import {
  branchInputSchema,
  canManageBranches,
  isDuplicateBranchAssignmentError,
  normalizeBranchInput,
} from "@/lib/branches/management";
import prisma from "@/lib/prisma";
import { isWithinPlanLimit } from "@/lib/entitlements";
import { getEffectivePlanLimits } from "@/lib/entitlements-server";
import { createBranchCommand } from "@/lib/server/business/branch-creation-command";
import {
  setBranchStatusCommand,
  updateBranchCommand,
} from "@/lib/server/business/branch-maintenance-command";
import {
  assignStaffToBranchCommand,
  removeStaffAssignmentCommand,
} from "@/lib/server/business/branch-staff-assignment-command";
import {
  actionBooleanSchema,
  opaqueIdSchema,
} from "@/lib/validation/action-input";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function branchesPath(slug: string) {
  return `/businesses/${slug}/branches`;
}

function redirectWithError(slug: string, error: string): never {
  redirect(`${branchesPath(slug)}?error=${error}`);
}

async function getBranchManagementContext(slug: string) {
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

  if (!business || !canManageBranches(session.user, business.id)) {
    redirect("/dashboard");
  }

  return { business, session };
}

function revalidateBranchPaths(slug: string) {
  revalidatePath(branchesPath(slug));
  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/businesses/${slug}/scan`);
}

function parseBranchForm(formData: FormData) {
  return branchInputSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
  });
}

export async function createBranchAction(slug: string, formData: FormData) {
  const { business, session } = await getBranchManagementContext(slug);
  const parsed = parseBranchForm(formData);
  if (!parsed.success) redirectWithError(business.slug, "invalid");

  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "EXPAND",
    )
  ) {
    redirectWithError(business.slug, "subscription-restricted");
  }

  const [branchCount, planLimits] = await Promise.all([
    prisma.branch.count({ where: { businessId: business.id } }),
    getEffectivePlanLimits(business.plan),
  ]);
  if (!isWithinPlanLimit(business.plan, "BRANCHES", branchCount, 1, planLimits)) {
    redirectWithError(business.slug, "plan-limit");
  }

  try {
    const result = await createBranchCommand({
      businessId: business.id,
      actor: {
        id: session.user.id,
        businessId: session.user.businessId,
        email: session.user.email,
      },
      branch: normalizeBranchInput(parsed.data),
    });

    if (!result.ok) {
      if (result.reason === "SUBSCRIPTION_RESTRICTED") {
        redirectWithError(business.slug, "subscription-restricted");
      }
      if (result.reason === "PLAN_LIMIT") {
        redirectWithError(business.slug, "plan-limit");
      }
      if (result.reason === "BUSINESS_NOT_FOUND") {
        redirectWithError(business.slug, "not-found");
      }
    }
  } catch (error) {
    if (isDuplicateBranchAssignmentError(error)) {
      redirectWithError(business.slug, "duplicate-name");
    }

    throw error;
  }

  revalidateBranchPaths(business.slug);
  redirect(`${branchesPath(business.slug)}?success=created`);
}

export async function updateBranchAction(
  slug: string,
  branchId: string,
  formData: FormData,
) {
  const { business, session } = await getBranchManagementContext(slug);
  const parsedBranchId = opaqueIdSchema.safeParse(branchId);
  const parsed = parseBranchForm(formData);
  if (!parsedBranchId.success || !parsed.success) {
    redirectWithError(business.slug, "invalid");
  }
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirectWithError(business.slug, "subscription-restricted");
  }

  try {
    const result = await updateBranchCommand({
      businessId: business.id,
      branchId: parsedBranchId.data,
      branch: normalizeBranchInput(parsed.data),
      actor: {
        id: session.user.id,
        businessId: session.user.businessId,
        email: session.user.email,
      },
    });
    if (!result.ok) {
      redirectWithError(
        business.slug,
        result.reason === "SUBSCRIPTION_RESTRICTED"
          ? "subscription-restricted"
          : "not-found",
      );
    }
  } catch (error) {
    if (isDuplicateBranchAssignmentError(error)) {
      redirectWithError(business.slug, "duplicate-name");
    }

    throw error;
  }

  revalidateBranchPaths(business.slug);
  redirect(`${branchesPath(business.slug)}?success=updated`);
}

export async function setBranchStatusAction(
  slug: string,
  branchId: string,
  isActive: boolean,
) {
  const { business, session } = await getBranchManagementContext(slug);
  const parsedBranchId = opaqueIdSchema.safeParse(branchId);
  const parsedStatus = actionBooleanSchema.safeParse(isActive);
  if (!parsedBranchId.success || !parsedStatus.success) {
    redirectWithError(business.slug, "invalid");
  }
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirectWithError(business.slug, "subscription-restricted");
  }

  const result = await setBranchStatusCommand({
    businessId: business.id,
    branchId: parsedBranchId.data,
    isActive: parsedStatus.data,
    actor: {
      id: session.user.id,
      businessId: session.user.businessId,
      email: session.user.email,
    },
  });
  if (!result.ok) {
    redirectWithError(
      business.slug,
      result.reason === "SUBSCRIPTION_RESTRICTED"
        ? "subscription-restricted"
        : "not-found",
    );
  }

  revalidateBranchPaths(business.slug);
  redirect(
    `${branchesPath(business.slug)}?success=${
      parsedStatus.data ? "activated" : "deactivated"
    }`,
  );
}

export async function assignStaffToBranchAction(
  slug: string,
  branchId: string,
  formData: FormData,
) {
  const { business, session } = await getBranchManagementContext(slug);
  const parsedBranchId = opaqueIdSchema.safeParse(branchId);
  const parsedUserId = opaqueIdSchema.safeParse(formData.get("userId"));
  if (!parsedBranchId.success || !parsedUserId.success) {
    redirectWithError(business.slug, "invalid");
  }
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirectWithError(business.slug, "subscription-restricted");
  }

  try {
    const result = await assignStaffToBranchCommand({
      businessId: business.id,
      branchId: parsedBranchId.data,
      userId: parsedUserId.data,
      actor: {
        id: session.user.id,
        businessId: session.user.businessId,
        email: session.user.email,
      },
    });

    if (!result.ok) {
      if (result.reason === "SUBSCRIPTION_RESTRICTED") {
        redirectWithError(business.slug, "subscription-restricted");
      }
      if (result.reason === "BRANCH_NOT_FOUND") {
        redirectWithError(business.slug, "not-found");
      }
      if (result.reason === "INELIGIBLE_USER") {
        redirectWithError(business.slug, "ineligible-user");
      }
    }
  } catch (error) {
    if (isDuplicateBranchAssignmentError(error)) {
      redirectWithError(business.slug, "duplicate-assignment");
    }

    throw error;
  }

  revalidateBranchPaths(business.slug);
  redirect(`${branchesPath(business.slug)}?success=assigned`);
}

export async function removeStaffAssignmentAction(
  slug: string,
  assignmentId: string,
) {
  const { business, session } = await getBranchManagementContext(slug);
  const parsedAssignmentId = opaqueIdSchema.safeParse(assignmentId);
  if (!parsedAssignmentId.success) redirectWithError(business.slug, "invalid");
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirectWithError(business.slug, "subscription-restricted");
  }

  const result = await removeStaffAssignmentCommand({
    businessId: business.id,
    assignmentId: parsedAssignmentId.data,
    actor: {
      id: session.user.id,
      businessId: session.user.businessId,
      email: session.user.email,
    },
  });
  if (!result.ok) {
    redirectWithError(
      business.slug,
      result.reason === "SUBSCRIPTION_RESTRICTED"
        ? "subscription-restricted"
        : "not-found",
    );
  }

  revalidateBranchPaths(business.slug);
  redirect(`${branchesPath(business.slug)}?success=assignment-removed`);
}
