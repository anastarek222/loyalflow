import type { UserRole } from "@/generated/prisma/client";
import { isValidBusinessPhone, optionalProfileValue } from "@/lib/business-profile";
import { canManageBusiness, type TenantUser } from "@/lib/permissions";
import { z } from "zod";

export const BRANCH_ASSIGNABLE_ROLES = ["STAFF"] as const satisfies readonly UserRole[];

export const branchInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(250),
  contactPhone: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidBusinessPhone(value)),
});

export type BranchManagementTarget = {
  businessId: string;
  isActive: boolean;
};

export type BranchAssignableUser = {
  businessId: string | null;
  isActive: boolean;
  role: UserRole;
};

export function canManageBranches(user: TenantUser, businessId: string) {
  return canManageBusiness(user, businessId);
}

export function normalizeBranchInput(input: z.infer<typeof branchInputSchema>) {
  return {
    name: input.name,
    address: optionalProfileValue(input.address),
    contactPhone: optionalProfileValue(input.contactPhone),
  };
}

export function getTenantScopedBranchWhere(branchId: string, businessId: string) {
  return { id: branchId, businessId };
}

export function getTenantScopedAssignmentWhere(assignmentId: string, businessId: string) {
  return { id: assignmentId, businessId };
}

export function getBranchAssignmentEligibility(input: {
  businessId: string;
  branch: BranchManagementTarget;
  user: BranchAssignableUser;
}) {
  if (input.branch.businessId !== input.businessId) {
    return "CROSS_TENANT_BRANCH" as const;
  }

  if (input.user.businessId !== input.businessId) {
    return "CROSS_TENANT_USER" as const;
  }

  if (!input.branch.isActive) {
    return "INACTIVE_BRANCH" as const;
  }

  if (!input.user.isActive) {
    return "INACTIVE_USER" as const;
  }

  if (!BRANCH_ASSIGNABLE_ROLES.some((role) => role === input.user.role)) {
    return "INELIGIBLE_ROLE" as const;
  }

  return "ELIGIBLE" as const;
}

export function isDuplicateBranchAssignmentError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export function getBranchCount(branches: readonly unknown[]) {
  return branches.length;
}
