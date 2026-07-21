import type { Capability, TenantUser } from "@/lib/permissions";
import { canPerform, isSuperAdmin } from "@/lib/permissions";

export type BranchAccessTarget = {
  id: string;
  businessId: string;
  isActive: boolean;
};

type BranchAccessInput = {
  user: TenantUser;
  businessId: string;
  branch: BranchAccessTarget;
  assignedBranchIds?: readonly string[];
};

/**
 * Branch membership is additive to existing tenant access. Owners, managers,
 * and viewers retain their business-wide role scope. Cashier/staff users need
 * an explicit assignment before a branch can be selected for their work.
 */
export function canAccessBranch({
  user,
  businessId,
  branch,
  assignedBranchIds = [],
}: BranchAccessInput) {
  if (branch.businessId !== businessId) return false;
  if (isSuperAdmin(user)) return true;
  if (user.businessId !== businessId) return false;

  if (user.role === "STAFF") {
    return assignedBranchIds.includes(branch.id);
  }

  return user.role === "OWNER" || user.role === "MANAGER" || user.role === "VIEWER";
}

/**
 * New loyalty writes must name an active same-tenant branch and pass the
 * existing capability check. Historical records with no branch remain valid
 * and continue to be reported at business scope.
 */
export function canWriteAtBranch(
  input: BranchAccessInput & { capability: Capability }
) {
  return (
    input.branch.isActive &&
    canPerform(input.user, input.businessId, input.capability) &&
    canAccessBranch(input)
  );
}

export function branchReportFilter(branchId?: string) {
  return branchId ? { branchId } : {};
}
