import type { Prisma } from "@/generated/prisma/client";

type BusinessCapacityLockTransaction = Pick<
  Prisma.TransactionClient,
  "$queryRaw"
>;

/**
 * Serialize plan-capacity-changing writes for one tenant on its canonical
 * Business row. Call this before any persisted resource count/limit check.
 */
export async function lockBusinessCapacity(
  transaction: BusinessCapacityLockTransaction,
  businessId: string,
): Promise<void> {
  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Business"
    WHERE "id" = ${businessId}
    FOR UPDATE
  `;
}
