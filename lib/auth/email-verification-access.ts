import prisma from "@/lib/prisma";

export async function isEmailVerificationSatisfied(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ verifiedAt: Date | null }>>`
    SELECT "verifiedAt"
    FROM "EmailVerificationState"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  const state = rows[0];

  // Compatibility rule: accounts that predate the verification lifecycle have no
  // state row and remain sign-in compatible. Newly enrolled accounts receive an
  // explicit state row, so a null verifiedAt blocks them until mailbox proof.
  return !state || state.verifiedAt !== null;
}
