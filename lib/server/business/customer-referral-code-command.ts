import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import { createReferralCodeCandidate } from "@/lib/referrals/code";
import prisma from "@/lib/prisma";

export type CustomerReferralCodeCommandResult =
  | Readonly<{ ok: true; state: "CREATED" | "EXISTING" }>
  | Readonly<{
      ok: false;
      reason: "SUBSCRIPTION_RESTRICTED" | "TARGET_NOT_FOUND" | "CREATE_FAILED";
    }>;

function isUniqueConflict(error: unknown) {
  return Boolean(
    typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002",
  );
}

/**
 * Authoritative Customer referral-code creation boundary.
 *
 * Existing-code replay is intentionally resolved before EXPAND enforcement so
 * restricted subscriptions can still read/reuse an identity that already
 * exists. New identity creation revalidates Customer tenant ownership and
 * persisted EXPAND state in the same transaction. Unique races retry without
 * inventing duplicate referral identities.
 */
export async function ensureCustomerReferralCodeCommand(input: {
  businessId: string;
  customerId: string;
}): Promise<CustomerReferralCodeCommandResult> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const customer = await transaction.customer.findFirst({
          where: { id: input.customerId, businessId: input.businessId },
          select: { id: true },
        });
        if (!customer) {
          return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
        }

        const existing = await transaction.customerReferralCode.findUnique({
          where: {
            businessId_customerId: {
              businessId: input.businessId,
              customerId: customer.id,
            },
          },
          select: { id: true },
        });
        if (existing) {
          return { ok: true, state: "EXISTING" } as const;
        }

        if (
          !(await canBusinessPerformSubscriptionOperation(
            transaction,
            input.businessId,
            "EXPAND",
          ))
        ) {
          return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
        }

        await transaction.customerReferralCode.create({
          data: {
            businessId: input.businessId,
            customerId: customer.id,
            code: createReferralCodeCandidate(),
          },
        });

        return { ok: true, state: "CREATED" } as const;
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;

      const codeCreatedByAnotherRequest =
        await prisma.customerReferralCode.findUnique({
          where: {
            businessId_customerId: {
              businessId: input.businessId,
              customerId: input.customerId,
            },
          },
          select: { id: true },
        });
      if (codeCreatedByAnotherRequest) {
        return { ok: true, state: "EXISTING" } as const;
      }
    }
  }

  return { ok: false, reason: "CREATE_FAILED" } as const;
}
