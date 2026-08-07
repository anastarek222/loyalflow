import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../generated/prisma/client";
import { recordEarnReversal } from "../lib/loyalty/earn-reversal";
import {
  FinancialOperationConflictError,
  recordLoyaltyEarn,
} from "../lib/loyalty/transactions";
import { logServerError } from "../lib/server/logging";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const fixtureBusinessIds: string[] = [];
const transactionOptions = { maxWait: 30_000, timeout: 15_000 } as const;
const actor = {
  id: `reversal-concurrency-${runId}`,
  role: "SUPER_ADMIN" as const,
  businessId: null,
};

async function inTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(operation, transactionOptions);
}

async function createCustomer(businessId: string, suffix: string) {
  return prisma.customer.create({
    data: {
      firstName: "Reversal",
      lastName: suffix,
      phone: `+208${randomUUID().replaceAll("-", "").slice(0, 11)}`,
      customerCode: `REV-${runId}-${suffix}`,
      businessId,
    },
  });
}

async function earn(customerId: string, businessId: string, amount: number) {
  const idempotencyKey = randomUUID();

  return inTransaction(async (transaction) => {
    const balanceAfter = await recordLoyaltyEarn(transaction, {
      customerId,
      businessId,
      amount,
      sourceLoyaltyMode: "POINTS",
      idempotencyKey,
      transactionNote: "Reversal concurrency fixture earn",
      activityDescription: "Reversal concurrency fixture earn",
    });

    assert.notEqual(balanceAfter, null);

    const ledgerTransaction = await transaction.loyaltyTransaction.findUnique({
      where: {
        businessId_idempotencyKey: {
          businessId,
          idempotencyKey,
        },
      },
      select: {
        id: true,
      },
    });

    assert.ok(ledgerTransaction);

    return {
      balanceAfter,
      transactionId: ledgerTransaction.id,
    };
  });
}

function reverse(
  customerId: string,
  businessId: string,
  originalTransactionId: string,
  amount: number,
  operationId: string,
) {
  return inTransaction((transaction) =>
    recordEarnReversal(transaction, {
      customerId,
      businessId,
      originalTransactionId,
      actor,
      kind: "EARN_REFUND",
      amount,
      reason: "Real PostgreSQL reversal concurrency verification",
      idempotencyKey: operationId,
    }),
  );
}

async function cleanup() {
  for (const businessId of fixtureBusinessIds) {
    await prisma.business.delete({ where: { id: businessId } }).catch(() => undefined);
  }
}

async function main() {
  const database = await prisma.$queryRaw<{ database: string }[]>`
    SELECT current_database() AS database
  `;
  assert.equal(
    database[0]?.database,
    "loyalflow_test",
    "Refusing to run destructive reversal concurrency verification outside loyalflow_test.",
  );

  const business = await prisma.business.create({
    data: {
      name: "LoyalFlow reversal concurrency verification",
      slug: `lf-reversal-concurrency-${runId}`,
      loyaltyMode: "POINTS",
      unitName: "point",
      rewardThreshold: 10,
      earnAmount: 1,
    },
  });
  fixtureBusinessIds.push(business.id);

  const duplicateCustomer = await createCustomer(business.id, "duplicate");
  const duplicateEarn = await earn(duplicateCustomer.id, business.id, 10);
  assert.ok(duplicateEarn);
  const duplicateOperationId = randomUUID();
  const duplicateResults = await Promise.all([
    reverse(
      duplicateCustomer.id,
      business.id,
      duplicateEarn.transactionId,
      4,
      duplicateOperationId,
    ),
    reverse(
      duplicateCustomer.id,
      business.id,
      duplicateEarn.transactionId,
      4,
      duplicateOperationId,
    ),
  ]);
  assert.deepEqual(
    duplicateResults.map((result) => result.status).sort(),
    ["APPLIED", "REPLAYED"],
  );
  assert.deepEqual(
    await prisma.customer.findUniqueOrThrow({
      where: {
        id_businessId: {
          id: duplicateCustomer.id,
          businessId: business.id,
        },
      },
      select: { balance: true, lifetimeEarned: true },
    }),
    { balance: 6, lifetimeEarned: 10 },
  );
  assert.equal(
    await prisma.loyaltyTransaction.count({
      where: {
        businessId: business.id,
        idempotencyKey: duplicateOperationId,
        type: "REVERSAL",
      },
    }),
    1,
  );
  console.log("PASS A: simultaneous duplicate refund applied once and replayed once.");

  const competingCustomer = await createCustomer(business.id, "competing");
  const competingEarn = await earn(competingCustomer.id, business.id, 10);
  assert.ok(competingEarn);
  const competingResults = await Promise.all([
    reverse(
      competingCustomer.id,
      business.id,
      competingEarn.transactionId,
      6,
      randomUUID(),
    ),
    reverse(
      competingCustomer.id,
      business.id,
      competingEarn.transactionId,
      6,
      randomUUID(),
    ),
  ]);
  assert.equal(
    competingResults.filter((result) => result.status === "APPLIED").length,
    1,
  );
  assert.equal(
    competingResults.filter(
      (result) =>
        result.status === "BLOCKED" &&
        result.reason === "REVERSAL_EXCEEDS_ORIGINAL",
    ).length,
    1,
  );
  assert.deepEqual(
    await prisma.customer.findUniqueOrThrow({
      where: {
        id_businessId: {
          id: competingCustomer.id,
          businessId: business.id,
        },
      },
      select: { balance: true, lifetimeEarned: true },
    }),
    { balance: 4, lifetimeEarned: 10 },
  );
  assert.equal(
    await prisma.loyaltyTransaction.count({
      where: {
        businessId: business.id,
        customerId: competingCustomer.id,
        reversalOfTransactionId: competingEarn.transactionId,
        type: "REVERSAL",
      },
    }),
    1,
  );
  console.log("PASS B: competing partial refunds cannot exceed the original earn.");

  const blockedCustomer = await createCustomer(business.id, "blocked");
  const blockedEarn = await earn(blockedCustomer.id, business.id, 10);
  assert.ok(blockedEarn);
  await prisma.customer.update({
    where: {
      id_businessId: {
        id: blockedCustomer.id,
        businessId: business.id,
      },
    },
    data: { balance: 2 },
  });
  const blockedOperationId = randomUUID();
  const blockedResults = await Promise.all([
    reverse(
      blockedCustomer.id,
      business.id,
      blockedEarn.transactionId,
      5,
      blockedOperationId,
    ),
    reverse(
      blockedCustomer.id,
      business.id,
      blockedEarn.transactionId,
      5,
      blockedOperationId,
    ),
  ]);
  assert.equal(
    blockedResults.filter(
      (result) =>
        result.status === "BLOCKED" && result.reason === "INSUFFICIENT_BALANCE",
    ).length,
    2,
  );
  assert.equal(
    await prisma.reversalException.count({
      where: {
        businessId: business.id,
        operationId: blockedOperationId,
        status: "OPEN",
        blockReason: "INSUFFICIENT_BALANCE",
      },
    }),
    1,
  );
  assert.equal(
    await prisma.loyaltyTransaction.count({
      where: {
        businessId: business.id,
        idempotencyKey: blockedOperationId,
      },
    }),
    0,
  );
  assert.equal(
    (
      await prisma.customer.findUniqueOrThrow({
        where: {
          id_businessId: {
            id: blockedCustomer.id,
            businessId: business.id,
          },
        },
        select: { balance: true },
      })
    ).balance,
    2,
  );
  console.log("PASS C: blocked duplicate refund persists one durable exception and no ledger row.");

  const conflictCustomer = await createCustomer(business.id, "conflict");
  const conflictEarn = await earn(conflictCustomer.id, business.id, 10);
  assert.ok(conflictEarn);
  const conflictOperationId = randomUUID();
  const conflictResults = await Promise.allSettled([
    reverse(
      conflictCustomer.id,
      business.id,
      conflictEarn.transactionId,
      4,
      conflictOperationId,
    ),
    reverse(
      conflictCustomer.id,
      business.id,
      conflictEarn.transactionId,
      5,
      conflictOperationId,
    ),
  ]);
  const fulfilled = conflictResults.filter(
    (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof reverse>>> =>
      result.status === "fulfilled",
  );
  const rejected = conflictResults.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0]?.reason instanceof FinancialOperationConflictError);
  assert.equal(fulfilled[0]?.value.status, "APPLIED");
  const winningAmount =
    fulfilled[0]?.value.status === "APPLIED"
      ? 10 - fulfilled[0].value.balanceAfter
      : 0;
  assert.ok(winningAmount === 4 || winningAmount === 5);
  assert.equal(
    await prisma.loyaltyTransaction.count({
      where: {
        businessId: business.id,
        idempotencyKey: conflictOperationId,
        type: "REVERSAL",
      },
    }),
    1,
  );
  assert.equal(
    (
      await prisma.customer.findUniqueOrThrow({
        where: {
          id_businessId: {
            id: conflictCustomer.id,
            businessId: business.id,
          },
        },
        select: { balance: true },
      })
    ).balance,
    10 - winningAmount,
  );
  console.log("PASS D: conflicting simultaneous intent accepts one immutable operation and rejects the other.");
}

main()
  .catch((error: unknown) => {
    logServerError("reversal_concurrency_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
