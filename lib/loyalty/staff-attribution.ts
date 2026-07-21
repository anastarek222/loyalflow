import type { Prisma } from "@/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

type StaffAttributionInput = {
  businessId: string;
  branchId?: string;
  attributedStaffId?: string;
};

type StaffAttributionResult =
  | {
      valid: true;
      attributedStaffId: string | null;
    }
  | {
      valid: false;
      reason:
        "ATTRIBUTION_REQUIRED" | "INVALID_STAFF" | "INVALID_BRANCH_ASSIGNMENT";
    };

const ATTRIBUTABLE_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;

export async function validateStaffAttribution(
  transaction: TransactionClient,
  input: StaffAttributionInput,
): Promise<StaffAttributionResult> {
  const business = await transaction.business.findUnique({
    where: {
      id: input.businessId,
    },
    select: {
      staffAttributionEnabled: true,
      staffAttributionRequired: true,
    },
  });

  if (!business) {
    return {
      valid: false,
      reason: "INVALID_STAFF",
    };
  }

  // Attribution is disabled for this business.
  // Ignore any unexpected attribution value rather than persisting it.
  if (!business.staffAttributionEnabled) {
    return {
      valid: true,
      attributedStaffId: null,
    };
  }

  if (!input.attributedStaffId) {
    if (business.staffAttributionRequired) {
      return {
        valid: false,
        reason: "ATTRIBUTION_REQUIRED",
      };
    }

    return {
      valid: true,
      attributedStaffId: null,
    };
  }

  const staff = await transaction.user.findFirst({
    where: {
      id: input.attributedStaffId,
      businessId: input.businessId,
      isActive: true,
      role: {
        in: [...ATTRIBUTABLE_ROLES],
      },
    },
    select: {
      id: true,
    },
  });

  if (!staff) {
    return {
      valid: false,
      reason: "INVALID_STAFF",
    };
  }

  if (input.branchId) {
    const assignment = await transaction.branchStaffAssignment.findFirst({
      where: {
        businessId: input.businessId,
        branchId: input.branchId,
        userId: staff.id,
      },
      select: {
        id: true,
      },
    });

    if (!assignment) {
      return {
        valid: false,
        reason: "INVALID_BRANCH_ASSIGNMENT",
      };
    }
  }

  return {
    valid: true,
    attributedStaffId: staff.id,
  };
}
