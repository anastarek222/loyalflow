import type { Prisma, PrismaClient, UserRole } from "@/generated/prisma/client";
import { canPerform, isSuperAdmin, type Capability } from "@/lib/permissions";
import { validateStaffAttribution } from "@/lib/loyalty/staff-attribution";

type TransactionClient = Prisma.TransactionClient;

export type FinancialOperationActor = {
  id: string;
  role: UserRole;
  businessId: string | null;
};

type FinancialOperationContextInput = {
  businessId: string;
  capability: Capability;
  actor?: FinancialOperationActor;
  branchId?: string;
  attributedStaffId?: string;
  legacyCreatedById?: string;
};

export type FinancialOperationContext =
  | {
      valid: true;
      branchId: string | undefined;
      createdById: string | undefined;
      attributedStaffId: string | undefined;
    }
  | {
      valid: false;
      reason:
        | "ACTOR_NOT_ALLOWED"
        | "INVALID_BRANCH"
        | "BRANCH_REQUIRED_FOR_STAFF"
        | "INVALID_BRANCH_ASSIGNMENT"
        | "ATTRIBUTION_REQUIRED"
        | "INVALID_STAFF";
    };

export type OperationContextOptions = {
  branches: Array<{ id: string; name: string }>;
  staff: Array<{ id: string; firstName: string; lastName: string | null }>;
  branchRequired: boolean;
};

const ATTRIBUTABLE_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;

/**
 * Branches are optional to preserve pre-branch businesses and historical
 * records. Once a business has active branches, STAFF must select one of
 * their assigned active branches; owners and managers retain business-wide
 * access. This prevents an unassigned staff member from bypassing branch
 * restrictions by omitting a branch ID.
 */
export async function resolveFinancialOperationContext(
  transaction: TransactionClient,
  input: FinancialOperationContextInput,
): Promise<FinancialOperationContext> {
  if (input.actor && !canPerform(input.actor, input.businessId, input.capability)) {
    return { valid: false, reason: "ACTOR_NOT_ALLOWED" };
  }

  const branchId = input.branchId;

  if (branchId) {
    const branch = await transaction.branch.findFirst({
      where: {
        id: branchId,
        businessId: input.businessId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!branch) {
      return { valid: false, reason: "INVALID_BRANCH" };
    }

    if (input.actor?.role === "STAFF") {
      const assignment = await transaction.branchStaffAssignment.findFirst({
        where: {
          businessId: input.businessId,
          branchId,
          userId: input.actor.id,
        },
        select: { id: true },
      });

      if (!assignment) {
        return { valid: false, reason: "INVALID_BRANCH_ASSIGNMENT" };
      }
    }
  } else if (input.actor?.role === "STAFF") {
    const activeBranchCount = await transaction.branch.count({
      where: {
        businessId: input.businessId,
        isActive: true,
      },
    });

    if (activeBranchCount > 0) {
      return { valid: false, reason: "BRANCH_REQUIRED_FOR_STAFF" };
    }
  }

  const attribution = await validateStaffAttribution(transaction, {
    businessId: input.businessId,
    branchId,
    attributedStaffId: input.attributedStaffId,
  });

  if (!attribution.valid) {
    return attribution;
  }

  return {
    valid: true,
    branchId,
    // SUPER_ADMIN users are intentionally not tenant-scoped User rows, so the
    // composite audit FK cannot store their ID. Preserve the current global
    // administrator architecture by leaving this relation null for them.
    createdById:
      input.actor && !isSuperAdmin(input.actor)
        ? input.actor.id
        : input.legacyCreatedById,
    attributedStaffId: attribution.attributedStaffId ?? undefined,
  };
}

/** Returns only options that the current actor may submit to a loyalty form. */
export async function getOperationContextOptions(
  client: Pick<PrismaClient, "branch" | "user">,
  input: { businessId: string; actor: FinancialOperationActor },
): Promise<OperationContextOptions> {
  const branchWhere: Prisma.BranchWhereInput = {
    businessId: input.businessId,
    isActive: true,
    ...(input.actor.role === "STAFF"
      ? {
          staffAssignments: {
            some: {
              businessId: input.businessId,
              userId: input.actor.id,
            },
          },
        }
      : {}),
  };

  const [branches, staff, activeBranchCount] = await Promise.all([
    client.branch.findMany({
      where: branchWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    client.user.findMany({
      where: {
        businessId: input.businessId,
        isActive: true,
        role: { in: [...ATTRIBUTABLE_ROLES] },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    client.branch.count({
      where: {
        businessId: input.businessId,
        isActive: true,
      },
    }),
  ]);

  return {
    branches,
    staff,
    branchRequired: input.actor.role === "STAFF" && activeBranchCount > 0,
  };
}
