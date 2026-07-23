import type { CustomerSegment } from "@/lib/customers/segments";

export type HistoricalBranch = {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
};

export type HistoricalStaff = {
  id: string;
  businessId: string | null;
};

export type ReportScope = {
  branchId?: string;
  attributedStaffId?: string;
};

/**
 * Branches and staff are resolved from already tenant-scoped lists. Inactive
 * records remain valid report filters because reports describe history, not
 * currently permitted operational choices.
 */
export function resolveReportScope(
  input: {
    branchId?: string | null;
    staffId?: string | null;
    businessId: string;
    branches: readonly HistoricalBranch[];
    staff: readonly HistoricalStaff[];
  }
): ReportScope | null {
  const branchId = input.branchId && input.branchId !== "all"
    ? input.branchId
    : undefined;
  const staffId = input.staffId && input.staffId !== "all"
    ? input.staffId
    : undefined;

  if (
    branchId &&
    !input.branches.some(
      (branch) =>
        branch.id === branchId && branch.businessId === input.businessId
    )
  ) {
    return null;
  }

  if (
    staffId &&
    !input.staff.some(
      (staffMember) =>
        staffMember.id === staffId &&
        staffMember.businessId === input.businessId
    )
  ) {
    return null;
  }

  return {
    ...(branchId ? { branchId } : {}),
    ...(staffId ? { attributedStaffId: staffId } : {}),
  };
}

export function getReportQueryString(input: {
  from: string;
  to: string;
  segment?: CustomerSegment | null;
  loyaltyMode?: string | null;
  branchId?: string;
  attributedStaffId?: string;
}) {
  return new URLSearchParams({
    from: input.from,
    to: input.to,
    ...(input.segment ? { segment: input.segment } : {}),
    ...(input.loyaltyMode && input.loyaltyMode !== "all"
      ? { loyaltyMode: input.loyaltyMode }
      : {}),
    ...(input.branchId ? { branch: input.branchId } : {}),
    ...(input.attributedStaffId ? { staff: input.attributedStaffId } : {}),
  }).toString();
}

export function getCanonicalStaffAttribution(
  operation: { attributedStaffId: string | null | undefined }
) {
  return operation.attributedStaffId ?? null;
}

/** Monetary reporting is only supported by explicitly recorded sale amounts. */
export function getRecordedSalesWhere() {
  return {
    type: "EARN" as const,
    saleAmount: { not: null },
  };
}
