import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { reconcileCustomerLedger } from "@loyalflow/domain/loyalty/reconciliation";
import { PrismaClient } from "../generated/prisma/client";
import { assertDatabaseScriptEnvironment } from "../lib/server/database-script-guard";
import { logServerError } from "../lib/server/logging";

const BUSINESS_ARGUMENT = "--business-id=";
const MAX_REPORTED_MISMATCHES = 100;
const PAGE_SIZE = 200;

function requiredBusinessId(arguments_: readonly string[]) {
  const value = arguments_.find((argument) => argument.startsWith(BUSINESS_ARGUMENT))
    ?.slice(BUSINESS_ARGUMENT.length)
    .trim();
  if (!value || value.length > 128 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Ledger reconciliation requires --business-id=<safe tenant id>.");
  }
  return value;
}

async function main() {
  const identity = assertDatabaseScriptEnvironment("read-only-verification");
  if (identity.environment !== "development" && identity.environment !== "test") {
    throw new Error("Ledger reconciliation is restricted to development or test.");
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  const businessId = requiredBusinessId(process.argv.slice(2));
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const business = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
    if (!business) throw new Error("The requested business was not found.");

    let cursor: string | undefined;
    let scannedCustomers = 0;
    let mismatchCount = 0;
    const mismatches = [];

    while (true) {
      const customers = await prisma.customer.findMany({
        where: { businessId },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          businessId: true,
          balance: true,
          lifetimeEarned: true,
          lifetimeRedeemed: true,
          transactions: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              businessId: true,
              customerId: true,
              type: true,
              amount: true,
              balanceAfter: true,
              reversalKind: true,
              reversalOfTransactionId: true,
            },
          },
        },
      });
      if (customers.length === 0) break;

      for (const customer of customers) {
        const result = reconcileCustomerLedger({
          customerId: customer.id,
          businessId: customer.businessId,
          balance: customer.balance,
          lifetimeEarned: customer.lifetimeEarned,
          lifetimeRedeemed: customer.lifetimeRedeemed,
          transactions: customer.transactions,
        });
        scannedCustomers += 1;
        if (!result.matches) {
          mismatchCount += 1;
          if (mismatches.length < MAX_REPORTED_MISMATCHES) mismatches.push(result);
        }
      }

      cursor = customers.at(-1)?.id;
      if (customers.length < PAGE_SIZE || !cursor) break;
    }

    console.log(JSON.stringify({
      environment: identity.environment,
      businessId,
      scannedCustomers,
      matchingCustomers: scannedCustomers - mismatchCount,
      mismatchCount,
      reportedMismatchCount: mismatches.length,
      reportTruncated: mismatchCount > mismatches.length,
      mismatches,
    }, null, 2));
    if (mismatchCount > 0) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  logServerError("ledger_reconciliation_failed", error);
  process.exitCode = 1;
});
