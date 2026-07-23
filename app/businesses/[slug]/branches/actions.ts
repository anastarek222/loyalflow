"use server";

import { auth } from "@/auth";
import {
  branchInputSchema,
  canManageBranches,
  getBranchAssignmentEligibility,
  getTenantScopedAssignmentWhere,
  getTenantScopedBranchWhere,
  isDuplicateBranchAssignmentError,
  normalizeBranchInput,
} from "@/lib/branches/management";
import prisma from "@/lib/prisma";
import { actionBooleanSchema, opaqueIdSchema } from "@/lib/validation/action-input";
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
    select: { id: true, slug: true },
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
  const { business } = await getBranchManagementContext(slug);
  const parsed = parseBranchForm(formData);
  if (!parsed.success) redirectWithError(business.slug, "invalid");

  try {
    await prisma.branch.create({
      data: { businessId: business.id, ...normalizeBranchInput(parsed.data) },
    });
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
  const { business } = await getBranchManagementContext(slug);
  const parsedBranchId = opaqueIdSchema.safeParse(branchId);
  const parsed = parseBranchForm(formData);
  if (!parsedBranchId.success || !parsed.success) {
    redirectWithError(business.slug, "invalid");
  }

  try {
    const result = await prisma.branch.updateMany({
      where: getTenantScopedBranchWhere(parsedBranchId.data, business.id),
      data: normalizeBranchInput(parsed.data),
    });

    if (result.count !== 1) redirectWithError(business.slug, "not-found");
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
  const { business } = await getBranchManagementContext(slug);
  const parsedBranchId = opaqueIdSchema.safeParse(branchId);
  const parsedStatus = actionBooleanSchema.safeParse(isActive);
  if (!parsedBranchId.success || !parsedStatus.success) {
    redirectWithError(business.slug, "invalid");
  }

  const result = await prisma.branch.updateMany({
    where: getTenantScopedBranchWhere(parsedBranchId.data, business.id),
    data: { isActive: parsedStatus.data },
  });
  if (result.count !== 1) redirectWithError(business.slug, "not-found");

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
  const { business } = await getBranchManagementContext(slug);
  const parsedBranchId = opaqueIdSchema.safeParse(branchId);
  const parsedUserId = opaqueIdSchema.safeParse(formData.get("userId"));
  if (!parsedBranchId.success || !parsedUserId.success) {
    redirectWithError(business.slug, "invalid");
  }

  const [branch, user] = await Promise.all([
    prisma.branch.findFirst({
      where: getTenantScopedBranchWhere(parsedBranchId.data, business.id),
      select: { id: true, businessId: true, isActive: true },
    }),
    prisma.user.findUnique({
      where: { id: parsedUserId.data },
      select: { id: true, businessId: true, isActive: true, role: true },
    }),
  ]);

  if (!branch) redirectWithError(business.slug, "not-found");
  if (!user) redirectWithError(business.slug, "ineligible-user");

  const eligibility = getBranchAssignmentEligibility({
    businessId: business.id,
    branch,
    user,
  });
  if (eligibility !== "ELIGIBLE") {
    redirectWithError(business.slug, "ineligible-user");
  }

  try {
    await prisma.branchStaffAssignment.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        userId: user.id,
      },
    });
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
  const { business } = await getBranchManagementContext(slug);
  const parsedAssignmentId = opaqueIdSchema.safeParse(assignmentId);
  if (!parsedAssignmentId.success) redirectWithError(business.slug, "invalid");

  const result = await prisma.branchStaffAssignment.deleteMany({
    where: getTenantScopedAssignmentWhere(parsedAssignmentId.data, business.id),
  });
  if (result.count !== 1) redirectWithError(business.slug, "not-found");

  revalidateBranchPaths(business.slug);
  redirect(`${branchesPath(business.slug)}?success=assignment-removed`);
}
