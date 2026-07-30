import type { Prisma } from "@/generated/prisma/client";
import type { TenantUser } from "@/lib/permissions";

export type BusinessDeletionConfirmationResult =
  | { valid: true }
  | { valid: false; reason: "BUSINESS_NAME_MISMATCH" | "DELETE_WORD_MISMATCH" };

export function canDeleteBusiness(user: TenantUser, businessId: string) {
  return (
    user.role === "SUPER_ADMIN" ||
    (user.role === "OWNER" && user.businessId === businessId)
  );
}

export function validateBusinessDeletionConfirmation(
  input: {
    businessName: unknown;
    confirmationWord: unknown;
  },
  expectedBusinessName: string,
): BusinessDeletionConfirmationResult {
  if (
    typeof input.businessName !== "string" ||
    input.businessName !== expectedBusinessName
  ) {
    return { valid: false, reason: "BUSINESS_NAME_MISMATCH" };
  }

  if (
    typeof input.confirmationWord !== "string" ||
    input.confirmationWord !== "DELETE"
  ) {
    return { valid: false, reason: "DELETE_WORD_MISMATCH" };
  }

  return { valid: true };
}

export class BusinessDeletionStaleError extends Error {
  constructor() {
    super("BUSINESS_DELETE_STALE");
    this.name = "BusinessDeletionStaleError";
  }
}

export async function deleteBusinessData(
  transaction: Prisma.TransactionClient,
  businessId: string,
  confirmedBusinessName: string,
) {
  const lockedBusiness = await transaction.$queryRaw<
    Array<{ id: string; name: string }>
  >`
    SELECT "id", "name"
    FROM "Business"
    WHERE "id" = ${businessId}
    FOR UPDATE
  `;
  if (
    lockedBusiness.length !== 1 ||
    lockedBusiness[0]?.name !== confirmedBusinessName
  ) {
    throw new BusinessDeletionStaleError();
  }

  await transaction.notificationItemRead.deleteMany({ where: { businessId } });
  await transaction.notificationReadState.deleteMany({ where: { businessId } });
  await transaction.notification.deleteMany({ where: { businessId } });
  await transaction.customerNote.deleteMany({ where: { businessId } });
  await transaction.promotionApplication.deleteMany({ where: { businessId } });
  await transaction.rewardUnlock.deleteMany({ where: { businessId } });
  await transaction.rewardRedemption.deleteMany({ where: { businessId } });
  await transaction.businessActivity.deleteMany({ where: { businessId } });
  await transaction.branchStaffAssignment.deleteMany({ where: { businessId } });
  await transaction.loyaltyTransaction.deleteMany({ where: { businessId } });
  await transaction.referral.deleteMany({ where: { businessId } });
  await transaction.customerReferralCode.deleteMany({ where: { businessId } });
  await transaction.customerTagAssignment.deleteMany({ where: { businessId } });
  await transaction.customerTag.deleteMany({ where: { businessId } });
  await transaction.offer.deleteMany({ where: { businessId } });
  await transaction.promotion.deleteMany({ where: { businessId } });
  await transaction.reward.deleteMany({ where: { businessId } });
  await transaction.branch.deleteMany({ where: { businessId } });
  await transaction.customer.deleteMany({ where: { businessId } });

  await transaction.user.updateMany({
    where: {
      businessId,
      role: { in: ["OWNER", "MANAGER", "STAFF", "VIEWER"] },
    },
    data: {
      businessId: null,
      isActive: false,
      authVersion: { increment: 1 },
    },
  });
  await transaction.business.delete({ where: { id: businessId } });
}
